// sintesis-pasarela.js
(function(global, factory) {
    // UMD Pattern para compatibilidad con diferentes entornos
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser global
        global.SintesisPasarela = factory();
    }
}(this, function() {
    'use strict';

    const VERSION = '1.0.0';
    const BASE_URL = 'https://qa.sintesis.com.bo/pasarelapagos-msapi/embedded/api/v1';

    class SintesisPasarela {
        constructor(config = {}) {
            if (!config.apiKey) {
                throw new Error('API Key es requerida');
            }

            this.config = {
                apiKey: config.apiKey,
                baseUrl: config.baseUrl || BASE_URL,
                autoInit: config.autoInit !== false,
                debug: config.debug || false,
                onSuccess: config.onSuccess || null,
                onError: config.onError || null,
                onLoad: config.onLoad || null
            };

            this.accessToken = null;
            this.embedUrl = null;
            this.isInitialized = false;

            this._log('SDK inicializado', this.config);

            if (this.config.autoInit) {
                this.init();
            }
        }

        async init() {
            try {
                this._log('Inicializando pasarela...');
                
                // 1. Autenticación
                await this._authenticate();
                
                // 2. Generar enlace embebido
                await this._generateEmbedLink();
                
                this.isInitialized = true;
                this._log('Pasarela inicializada correctamente');
                
                if (this.config.onSuccess) {
                    this.config.onSuccess({ 
                        accessToken: this.accessToken, 
                        embedUrl: this.embedUrl 
                    });
                }
                
            } catch (error) {
                this._handleError('Error en inicialización', error);
            }
        }

        async _authenticate() {
            this._log('Autenticando...');
            
            const response = await this._makeRequest('/auth/authenticate', 'GET', null, {
                'X-API-KEY': this.config.apiKey
            });

            if (response.success && response.data.accessToken) {
                this.accessToken = response.data.accessToken;
                this._log('Autenticación exitosa');
            } else {
                throw new Error(`Error de autenticación: ${response.message}`);
            }
        }

        async _generateEmbedLink() {
            this._log('Generando enlace embebido...');
            
            const response = await this._makeRequest('/embed/generate-link', 'POST', null, {
                'Authorization': `Bearer ${this.accessToken}`
            });

            if (response.success && response.data.embedUrl) {
                this.embedUrl = response.data.embedUrl;
                this._log('Enlace embebido generado');
            } else {
                throw new Error(`Error generando enlace: ${response.message}`);
            }
        }

        async render(container, options = {}) {
            if (!this.isInitialized) {
                await this.init();
            }

            const config = {
                width: options.width || '100%',
                height: options.height || '600px',
                style: options.style || '',
                className: options.className || 'sintesis-pasarela-iframe',
                ...options
            };

            let containerElement;
            if (typeof container === 'string') {
                containerElement = document.getElementById(container);
                if (!containerElement) {
                    throw new Error(`Contenedor con ID '${container}' no encontrado`);
                }
            } else if (container instanceof HTMLElement) {
                containerElement = container;
            } else {
                throw new Error('Container debe ser un ID string o elemento HTML');
            }

            // Limpiar contenedor
            containerElement.innerHTML = '';

            // Crear iframe
            const iframe = document.createElement('iframe');
            iframe.src = this.embedUrl;
            iframe.width = config.width;
            iframe.height = config.height;
            iframe.className = config.className;
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
            iframe.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            
            if (config.style) {
                iframe.style.cssText += config.style;
            }

            // Atributos de seguridad y accesibilidad
            iframe.setAttribute('allow', 'payment');
            iframe.setAttribute('title', 'Pasarela de Pagos Sintesis');
            iframe.setAttribute('loading', 'lazy');

            // Evento cuando el iframe carga
            iframe.addEventListener('load', () => {
                this._log('Iframe de pasarela cargado');
                if (this.config.onLoad) {
                    this.config.onLoad(iframe);
                }
            });

            containerElement.appendChild(iframe);
            
            this._log('Pasarela renderizada en contenedor');
            return iframe;
        }

        async refresh() {
            this._log('Refrescando pasarela...');
            this.isInitialized = false;
            this.accessToken = null;
            this.embedUrl = null;
            await this.init();
        }

        getStatus() {
            return {
                isInitialized: this.isInitialized,
                hasAccessToken: !!this.accessToken,
                hasEmbedUrl: !!this.embedUrl,
                version: VERSION
            };
        }

        async _makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
            const url = this.config.baseUrl + endpoint;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            this._log(`Haciendo request a: ${method} ${endpoint}`);

            try {
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                this._log('Response recibido:', data);
                return data;
                
            } catch (error) {
                this._log('Error en request:', error);
                throw new Error(`Error de red: ${error.message}`);
            }
        }

        _handleError(context, error) {
            const errorMessage = `${context}: ${error.message}`;
            this._log('ERROR:', errorMessage);
            
            if (this.config.onError) {
                this.config.onError({
                    context: context,
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
            
            throw error;
        }

        _log(...args) {
            if (this.config.debug) {
                console.log('[SintesisPasarela]', ...args);
            }
        }

        // Método estático para versión
        static version() {
            return VERSION;
        }
    }

    return SintesisPasarela;
}));