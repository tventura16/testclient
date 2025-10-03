// sintesis-pasarela-universal.js v2.0.1
// SDK Universal Sintesis Pasarela - Compatible con Web, Mobile y Desktop
// (c) 2025 Sintesis - MIT License

(function (global, factory) {
  "use strict";

  // Detección universal de entorno
  var environment = (function () {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      return "web";
    } else if (
      typeof navigator !== "undefined" &&
      navigator.product === "ReactNative"
    ) {
      return "react-native";
    } else if (typeof importScripts !== "undefined") {
      return "worker";
    } else if (
      typeof process !== "undefined" &&
      process.versions &&
      process.versions.node
    ) {
      return "node";
    } else if (typeof Deno !== "undefined") {
      return "deno";
    } else {
      return "unknown";
    }
  })();

  // UMD Pattern universal mejorado
  if (typeof define === "function" && define.amd) {
    // AMD module
    define([], function () {
      return factory(environment);
    });
  } else if (typeof exports === "object" && typeof module !== "undefined") {
    // CommonJS module
    module.exports = factory(environment);
  } else {
    // Browser global
    if (typeof global !== "undefined") {
      if (!global.SintesisPasarela) {
        global.SintesisPasarela = factory(environment);
      }
      // Auto-inicialización solo en entorno web
      if (environment === "web" && typeof document !== "undefined") {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", function () {
            global.SintesisPasarela.autoInit();
          });
        } else {
          global.SintesisPasarela.autoInit();
        }
      }
    }
  }
})(
  typeof self !== "undefined"
    ? self
    : typeof window !== "undefined"
    ? window
    : typeof global !== "undefined"
    ? global
    : this,
  function (environment) {
    "use strict";

    const VERSION = "2.0.1";
    const BASE_URL =
      "https://qa.sintesis.com.bo/pasarelapagos-msapi/embedded/api/v1";

    // Sistema de logging universal
    class UniversalLogger {
      constructor(debug = false, prefix = "SintesisPasarela") {
        this.debug = debug;
        this.prefix = prefix;
        this.environment = environment;
      }

      log(...args) {
        if (!this.debug) return;

        const timestamp = new Date().toISOString();
        const message = `[${this.prefix} v${VERSION}] [${timestamp}] [${this.environment}]`;

        if (typeof console !== "undefined" && console.log) {
          console.log(message, ...args);
        }
      }

      error(...args) {
        const timestamp = new Date().toISOString();
        const message = `[${this.prefix} v${VERSION}] [ERROR] [${timestamp}] [${this.environment}]`;

        if (typeof console !== "undefined" && console.error) {
          console.error(message, ...args);
        } else if (console && console.log) {
          console.log("ERROR:", message, ...args);
        }
      }

      warn(...args) {
        if (!this.debug) return;

        const timestamp = new Date().toISOString();
        const message = `[${this.prefix} v${VERSION}] [WARN] [${timestamp}] [${this.environment}]`;

        if (typeof console !== "undefined" && console.warn) {
          console.warn(message, ...args);
        } else if (console && console.log) {
          console.log("WARN:", message, ...args);
        }
      }
    }

    // Cliente HTTP universal
    class UniversalHttpClient {
      constructor(config) {
        this.config = config;
        this.logger = new UniversalLogger(config.debug);
      }

      async request(endpoint, options = {}) {
        const url = this.config.baseUrl + endpoint;
        const requestOptions = {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
          ...options,
        };

        if (options.body) {
          requestOptions.body =
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body);
        }

        this.logger.log(`🌐 HTTP ${requestOptions.method} ${endpoint}`);

        try {
          // Diferentes implementaciones según el entorno
          let response;

          if (environment === "node") {
            // Node.js environment
            response = await this._nodeFetch(url, requestOptions);
          } else if (environment === "react-native") {
            // React Native environment
            response = await this._reactNativeFetch(url, requestOptions);
          } else {
            // Browser/Web environment (incluye WebView)
            response = await this._browserFetch(url, requestOptions);
          }

          const data = await this._parseResponse(response);
          this.logger.log(`✅ Response de ${endpoint}:`, data);
          return data;
        } catch (error) {
          this.logger.error(`❌ Error en request ${endpoint}:`, error);
          throw new Error(`Error de red (${environment}): ${error.message}`);
        }
      }

      async _browserFetch(url, options) {
        // Timeout para browser
        const controller =
          typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller
          ? setTimeout(() => controller.abort(), this.config.timeout)
          : null;

        if (controller) {
          options.signal = controller.signal;
        }

        try {
          const response = await fetch(url, options);

          if (timeoutId) clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return response;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          throw error;
        }
      }

      async _nodeFetch(url, options) {
        // Para Node.js, usar dynamic import de node-fetch
        try {
          const fetch = (await import("node-fetch")).default;
          return await fetch(url, options);
        } catch (error) {
          throw new Error("node-fetch no disponible en entorno Node.js");
        }
      }

      async _reactNativeFetch(url, options) {
        // React Native usa fetch nativo
        return await fetch(url, options);
      }

      async _parseResponse(response) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error(`Respuesta JSON inválida: ${text.substring(0, 100)}`);
        }
      }
    }

    // Clase principal universal
    class SintesisPasarelaCore {
      constructor(config = {}) {
        if (!config.apiKey) {
          throw new Error("SintesisPasarela: API Key es requerida");
        }

        this.environment = environment;
        this.logger = new UniversalLogger(config.debug);

        this.config = {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || BASE_URL,
          autoInit: config.autoInit !== false && environment === "web",
          debug: config.debug || false,
          timeout: config.timeout || 30000,
          mode: config.mode || "auto", // 'auto', 'webview', 'iframe', 'api-only'
          onSuccess: config.onSuccess || null,
          onError: config.onError || null,
          onLoad: config.onLoad || null,
          onTokenExpired: config.onTokenExpired || null,
          ...config,
        };

        this.httpClient = new UniversalHttpClient(this.config);
        this.accessToken = null;
        this.embedUrl = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;

        this.logger.log("SDK inicializado", {
          environment: this.environment,
          mode: this.config.mode,
          version: VERSION,
        });

        if (this.config.autoInit) {
          this.init().catch((error) => {
            this._handleError("Auto-inicialización falló", error);
          });
        }
      }

      async init() {
        if (this.isLoading) {
          this.logger.log("Inicialización ya en progreso");
          return;
        }

        if (this.isInitialized && this.accessToken) {
          this.logger.log("SDK ya inicializado");
          return;
        }

        this.isLoading = true;

        try {
          this.logger.log("Iniciando inicialización...");

          // 1. Autenticación
          await this._authenticate();

          // 2. Generar enlace embebido
          await this._generateEmbedLink();

          this.isInitialized = true;
          this.isLoading = false;
          this.retryCount = 0;

          this.logger.log("✅ Pasarela inicializada correctamente");

          this._triggerCallback("onSuccess", {
            accessToken: this.accessToken,
            embedUrl: this.embedUrl,
            environment: this.environment,
            timestamp: new Date().toISOString(),
          });

          return {
            success: true,
            accessToken: this.accessToken,
            embedUrl: this.embedUrl,
            environment: this.environment,
          };
        } catch (error) {
          this.isLoading = false;

          // Reintento automático
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.logger.log(
              `Reintentando... (${this.retryCount}/${this.maxRetries})`
            );
            await this._delay(1000 * this.retryCount);
            return this.init();
          }

          this._handleError("Error en inicialización", error);
          throw error;
        }
      }

      async _authenticate() {
        this.logger.log("🔐 Autenticando...");

        const response = await this.httpClient.request("/auth/authenticate", {
          method: "GET",
          headers: { "X-API-KEY": this.config.apiKey },
        });

        if (response.success && response.data.accessToken) {
          this.accessToken = response.data.accessToken;
          this.logger.log("✅ Autenticación exitosa");

          // Programar renovación del token solo en entornos con setTimeout
          if (typeof setTimeout !== "undefined") {
            this._scheduleTokenRefresh(response.data.expiresIn || 1800);
          }
        } else {
          throw new Error(
            `Error de autenticación: ${
              response.message || "Respuesta inválida"
            }`
          );
        }
      }

      async _generateEmbedLink() {
        this.logger.log("🔗 Generando enlace embebido...");

        if (!this.accessToken) {
          throw new Error("Token de acceso no disponible");
        }

        const response = await this.httpClient.request("/embed/generate-link", {
          method: "POST",
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });

        if (response.success && response.data.embedUrl) {
          this.embedUrl = response.data.embedUrl;
          this.logger.log("✅ Enlace embebido generado");
        } else {
          throw new Error(
            `Error generando enlace: ${
              response.message || "Respuesta inválida"
            }`
          );
        }
      }

      // Método universal para renderizar según el entorno
      async render(target, options = {}) {
        if (!this.isInitialized) {
          this.logger.log("SDK no inicializado, iniciando...");
          await this.init();
        }

        const mode = options.mode || this.config.mode;
        const renderConfig = {
          width: options.width || "100%",
          height: options.height || "600px",
          style: options.style || "",
          className: options.className || "sintesis-pasarela-iframe",
          ...options,
        };

        this.logger.log(`🎯 Renderizando en modo: ${mode}`);

        switch (mode) {
          case "iframe":
            return await this._renderIframe(target, renderConfig);

          case "webview":
            return await this._renderWebView(target, renderConfig);

          case "api-only":
            return await this._returnApiData(target, renderConfig);

          case "auto":
          default:
            return await this._autoRender(target, renderConfig);
        }
      }

      async _autoRender(target, config) {
        switch (this.environment) {
          case "web":
            return await this._renderIframe(target, config);

          case "react-native":
            return await this._renderWebView(target, config);

          case "node":
            return await this._returnApiData(target, config);

          default:
            return await this._returnApiData(target, config);
        }
      }

      async _renderIframe(container, config) {
        if (this.environment !== "web") {
          throw new Error("Modo iframe solo disponible en entorno web");
        }

        if (typeof document === "undefined") {
          throw new Error("Document no disponible en este entorno");
        }

        let containerElement;
        if (typeof container === "string") {
          containerElement = document.getElementById(container);
          if (!containerElement) {
            throw new Error(`Contenedor con ID '${container}' no encontrado`);
          }
        } else if (container instanceof HTMLElement) {
          containerElement = container;
        } else {
          throw new Error("Container debe ser un ID string o elemento HTML");
        }

        // Mostrar estado de carga
        containerElement.innerHTML = this._createLoadingHTML(config);

        try {
          const iframe = document.createElement("iframe");
          iframe.src = this.embedUrl;
          iframe.width = config.width;
          iframe.height = config.height;
          iframe.className = config.className;
          iframe.style.border = "none";
          iframe.style.borderRadius = "8px";
          iframe.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
          iframe.style.background = "white";

          if (config.style) {
            iframe.style.cssText += config.style;
          }

          // Atributos de seguridad
          iframe.setAttribute("allow", "payment");
          iframe.setAttribute("allowFullScreen", "");
          iframe.setAttribute("title", "Pasarela de Pagos Sintesis");
          iframe.setAttribute("loading", "eager");

          // Cargar iframe
          containerElement.innerHTML = "";
          containerElement.appendChild(iframe);

          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error("Timeout cargando iframe"));
            }, this.config.timeout);

            iframe.addEventListener("load", () => {
              clearTimeout(timeoutId);
              resolve();
            });

            iframe.addEventListener("error", (error) => {
              clearTimeout(timeoutId);
              reject(error);
            });
          });

          this.logger.log("✅ Iframe cargado exitosamente");
          this._triggerCallback("onLoad", { type: "iframe", element: iframe });

          return {
            type: "iframe",
            element: iframe,
            url: this.embedUrl,
          };
        } catch (error) {
          containerElement.innerHTML = this._createErrorHTML(error, config);
          this._handleError("Error renderizando iframe", error);
          throw error;
        }
      }

      async _renderWebView(target, config) {
        // Para React Native y apps móviles
        this.logger.log("📱 Preparando WebView para móvil");

        const webViewData = {
          type: "webview",
          url: this.embedUrl,
          config: {
            width: config.width,
            height: config.height,
            style: config.style,
          },
          environment: this.environment,
        };

        this._triggerCallback("onLoad", webViewData);

        return webViewData;
      }

      async _returnApiData(target, config) {
        // Solo retorna los datos para implementación personalizada
        this.logger.log(
          "🔧 Modo API-only: retornando datos para implementación personalizada"
        );

        const apiData = {
          type: "api",
          accessToken: this.accessToken,
          embedUrl: this.embedUrl,
          config: config,
          environment: this.environment,
          timestamp: new Date().toISOString(),
        };

        this._triggerCallback("onLoad", apiData);

        return apiData;
      }

      _createLoadingHTML(config) {
        return `
                <div class="sintesis-loading" style="
                    padding: 2rem; 
                    text-align: center; 
                    color: #666;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    border-radius: 8px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                ">
                    <div style="margin-bottom: 1rem; font-size: 2rem;">⏳</div>
                    <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">Cargando pasarela de pagos...</div>
                    <div style="font-size: 0.9rem; color: #999;">Sintesis Pasarela</div>
                </div>
            `;
      }

      _createErrorHTML(error, config) {
        return `
                <div class="sintesis-error" style="
                    padding: 2rem; 
                    text-align: center; 
                    background: #fee;
                    border: 1px solid #fcc;
                    border-radius: 8px;
                    color: #c33;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    <div style="margin-bottom: 1rem; font-size: 2rem;">❌</div>
                    <div style="font-size: 1.1rem; margin-bottom: 0.5rem;"><strong>Error al cargar la pasarela</strong></div>
                    <div style="margin-bottom: 1rem; font-size: 0.9em; color: #999;">
                        ${error.message}
                    </div>
                    <button onclick="window.location.reload()" style="
                        margin-top: 1rem;
                        padding: 0.5rem 1rem;
                        background: #c33;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">Reintentar</button>
                </div>
            `;
      }

      // Métodos utilitarios universales
      getEmbedUrl() {
        if (!this.isInitialized) {
          throw new Error("SDK no inicializado");
        }
        return this.embedUrl;
      }

      getAccessToken() {
        if (!this.isInitialized) {
          throw new Error("SDK no inicializado");
        }
        return this.accessToken;
      }

      async refresh() {
        this.logger.log("🔄 Refrescando pasarela...");
        this.isInitialized = false;
        this.accessToken = null;
        this.embedUrl = null;
        this.retryCount = 0;
        return await this.init();
      }

      destroy() {
        this.logger.log("🧹 Destruyendo instancia...");
        this.isInitialized = false;
        this.accessToken = null;
        this.embedUrl = null;
        this.isLoading = false;

        if (this._refreshTimeout && typeof clearTimeout !== "undefined") {
          clearTimeout(this._refreshTimeout);
          this._refreshTimeout = null;
        }

        this.logger.log("✅ Instancia destruida");
      }

      getStatus() {
        return {
          isInitialized: this.isInitialized,
          isLoading: this.isLoading,
          hasAccessToken: !!this.accessToken,
          hasEmbedUrl: !!this.embedUrl,
          environment: this.environment,
          mode: this.config.mode,
          retryCount: this.retryCount,
          version: VERSION,
          timestamp: new Date().toISOString(),
        };
      }

      _scheduleTokenRefresh(expiresIn) {
        if (typeof setTimeout === "undefined") return;

        const refreshTime = (expiresIn - 60) * 1000;

        if (this._refreshTimeout) {
          clearTimeout(this._refreshTimeout);
        }

        this._refreshTimeout = setTimeout(async () => {
          this.logger.log("🔄 Refrescando token expirado...");
          try {
            await this.refresh();
            this._triggerCallback("onTokenExpired", {
              refreshed: true,
              newToken: this.accessToken,
            });
          } catch (error) {
            this._handleError("Error refrescando token", error);
          }
        }, refreshTime);
      }

      _triggerCallback(callbackName, data) {
        if (typeof this.config[callbackName] === "function") {
          try {
            this.config[callbackName](data);
          } catch (error) {
            this.logger.error(`Error en callback ${callbackName}:`, error);
          }
        }
      }

      _handleError(context, error) {
        const errorMessage = `${context}: ${error.message}`;
        this.logger.error("ERROR:", errorMessage);

        this._triggerCallback("onError", {
          context: context,
          message: error.message,
          error: error,
          environment: this.environment,
          timestamp: new Date().toISOString(),
          status: this.getStatus(),
        });
      }

      _delay(ms) {
        return new Promise((resolve) => {
          if (typeof setTimeout !== "undefined") {
            setTimeout(resolve, ms);
          } else {
            resolve(); // Fallback para entornos sin setTimeout
          }
        });
      }
    }

    // API pública universal
    const SintesisPasarela = {
      create: function (config) {
        return new SintesisPasarelaCore(config);
      },

      version: VERSION,
      environment: environment,

      // Utilidades universales
      utils: {
        detectEnvironment: function () {
          return environment;
        },

        validateApiKey: function (apiKey) {
          return (
            typeof apiKey === "string" &&
            apiKey.length > 10 &&
            apiKey.includes("=")
          );
        },

        getPlatformInfo: function () {
          if (typeof navigator !== "undefined") {
            return {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              appName: navigator.appName,
              appVersion: navigator.appVersion,
            };
          } else if (typeof process !== "undefined") {
            return {
              platform: process.platform,
              arch: process.arch,
              version: process.version,
              env:
                typeof process.env !== "undefined"
                  ? "available"
                  : "unavailable",
            };
          } else {
            return { environment: environment };
          }
        },
      },

      // Auto-inicialización web
      autoInit: function () {
        if (environment !== "web" || typeof document === "undefined") return;

        const containers = document.querySelectorAll(
          "[data-sintesis-pasarela]"
        );
        containers.forEach((container) => {
          const apiKey = container.getAttribute("data-api-key");
          if (!apiKey) {
            console.warn("SintesisPasarela: data-api-key attribute missing");
            return;
          }

          const config = {
            apiKey: apiKey,
            debug: container.hasAttribute("data-debug"),
            mode: container.getAttribute("data-mode") || "auto",
          };

          try {
            const instance = new SintesisPasarelaCore(config);
            const renderOptions = {
              width: container.getAttribute("data-width") || "100%",
              height: container.getAttribute("data-height") || "600px",
              mode: config.mode,
            };

            instance.render(container, renderOptions);
          } catch (error) {
            console.error("SintesisPasarela: Error auto-inicializando:", error);
          }
        });
      },
    };

    // Aliases para compatibilidad
    SintesisPasarela.init = SintesisPasarela.create;
    SintesisPasarela.new = SintesisPasarela.create;

    return SintesisPasarela;
  }
);
