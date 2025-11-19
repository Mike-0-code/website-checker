class WebsiteChecker {
    constructor() {
        this.history = this.loadHistory();
        this.init();
    }

    init() {
        this.urlInput = document.getElementById('urlInput');
        this.checkButton = document.getElementById('checkButton');
        this.resultDiv = document.getElementById('result');
        this.historyList = document.getElementById('historyList');
        this.clearButton = document.getElementById('clearHistory');

        this.checkButton.addEventListener('click', () => this.checkWebsite());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkWebsite();
        });

        // Nuevo: Event listener para borrar historial
        this.clearButton.addEventListener('click', () => this.clearHistory());
        this.renderHistory();
        }

    clearHistory() {
        if (this.history.length === 0) return;
    
        if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
            // 1. Limpiar el array en memoria
            this.history = [];
        
            // 2. Limpiar el localStorage
            localStorage.removeItem('websiteCheckerHistory');
        
            // 3. Forzar una actualización inmediata de la UI
            this.renderHistory();
        
            // 4. Feedback visual opcional (puedes quitar esto si prefieres)
            this.showTempMessage('Historial borrado');
        }
    }
    showTempMessage(message) {
        const tempMsg = document.createElement('div');
        tempMsg.textContent = message;
        tempMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
        `;
        
        document.body.appendChild(tempMsg);
        
        setTimeout(() => {
            document.body.removeChild(tempMsg);
        }, 2000);
    }

    async checkWebsite() {
        const url = this.prepareUrl(this.urlInput.value.trim());
        
        if (!this.isValidUrl(url)) {
            this.showError('Por favor ingresa una URL válida con https://');
            return;
        }

        this.setLoading(true);
        
        try {
            const result = await this.performCheck(url);
            this.showResult(result);
            this.saveToHistory(result);
            this.renderHistory();
        } catch (error) {
            this.showError('Error al verificar el sitio: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    prepareUrl(inputUrl) {
        // Asegurar que la URL tenga protocolo
        if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
            return 'https://' + inputUrl;
        }
        return inputUrl;
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async performCheck(url) {
        const startTime = performance.now();
        
        try {
            // Usamos HEAD request para ser más rápidos y usar menos ancho de banda
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seg timeout
            
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const responseTime = performance.now() - startTime;

            return {
                url: url,
                status: 'online',
                responseTime: Math.round(responseTime),
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const responseTime = performance.now() - startTime;
            
            return {
                url: url,
                status: 'offline',
                error: error.message,
                responseTime: responseTime < 10000 ? Math.round(responseTime) : null, // Si fue timeout, no mostrar tiempo
                timestamp: new Date().toISOString()
            };
        }
    }

    showResult(result) {
        this.resultDiv.className = `result ${result.status}`;
        
        let html = '';
        if (result.status === 'online') {
            html = `
                <div class="status-icon">✅</div>
                <div class="status-title">¡El sitio está ONLINE!</div>
                <p>${result.url} está funcionando correctamente.</p>
                <div class="response-time">Tiempo de respuesta: ${result.responseTime}ms</div>
            `;
        } else {
            html = `
                <div class="status-icon">❌</div>
                <div class="status-title">El sitio está OFFLINE</div>
                <p>${result.url} no está accesible.</p>
                ${result.responseTime ? `<div class="response-time">Falló en: ${result.responseTime}ms</div>` : ''}
            `;
        }
        
        this.resultDiv.innerHTML = html;
        this.resultDiv.classList.remove('hidden');
    }

    showError(message) {
        this.resultDiv.className = 'result unknown';
        this.resultDiv.innerHTML = `
            <div class="status-icon">⚠️</div>
            <div class="status-title">Error</div>
            <p>${message}</p>
        `;
        this.resultDiv.classList.remove('hidden');
    }

    setLoading(loading) {
        this.checkButton.disabled = loading;
        this.checkButton.textContent = loading ? 'Verificando...' : 'Verificar';
    }

    // Historial en LocalStorage
    saveToHistory(result) {
    // Asegurarnos de que estamos trabajando con el array actual
    this.history.unshift({
        url: result.url,
        status: result.status,
        responseTime: result.responseTime,
        timestamp: result.timestamp
    });
        // Mantener solo los últimos 10 elementos
        this.history = this.history.slice(0, 10);
        // Guardar en localStorage
        localStorage.setItem('websiteCheckerHistory', JSON.stringify(this.history));
        // Actualizar la UI inmediatamente
        this.renderHistory();
    }

    loadHistory() {
        const stored = localStorage.getItem('websiteCheckerHistory');
        return stored ? JSON.parse(stored) : [];
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<p class="no-history">Aún no hay verificaciones recientes</p>';
            return;
        }

        this.historyList.innerHTML = this.history.map(item => `
            <div class="history-item">
                <span class="history-url">${this.shortenUrl(item.url)}</span>
                <span class="history-status ${item.status === 'online' ? 'status-online' : 'status-offline'}">
                    ${item.status === 'online' ? '✅ Online' : '❌ Offline'}
                </span>
                <span class="history-time">${this.formatTime(item.timestamp)}</span>
            </div>
        `).join('');
    }

    shortenUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url.length > 30 ? url.substring(0, 30) + '...' : url;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new WebsiteChecker();
});
