class TempMailApp {
    constructor() {
        this.currentEmail = localStorage.getItem('tempEmail');
        this.initElements();
        this.bindEvents();
        
        if (this.currentEmail) {
            this.displayCurrentEmail();
            this.checkEmails();
            this.startAutoRefresh();
        }
    }

    initElements() {
        this.elements = {
            generateBtn: document.getElementById('generate-btn'),
            emailDisplay: document.getElementById('email-display'),
            emailAddr: document.getElementById('email-addr'),
            copyBtn: document.getElementById('copy-btn'),
            deleteBtn: document.getElementById('delete-btn'),
            emailList: document.getElementById('email-list'),
            loadingSpinner: document.getElementById('loading-spinner'),
            errorMessage: document.getElementById('error-message')
        };
    }

    bindEvents() {
        this.elements.generateBtn.addEventListener('click', () => this.generateEmail());
        this.elements.copyBtn.addEventListener('click', () => this.copyEmail());
        this.elements.deleteBtn.addEventListener('click', () => this.deleteEmail());
    }

    async generateEmail() {
        try {
            const randomId = Math.random().toString(36).substring(2, 10);
            this.currentEmail = `${randomId}@${JSONBIN_CONFIG.DOMAIN}`;
            
            localStorage.setItem('tempEmail', this.currentEmail);
            this.displayCurrentEmail();
            
            await this.saveEmailToDB();
            this.checkEmails();
            this.startAutoRefresh();
            
        } catch (error) {
            this.showError("Errore nella generazione dell'email");
            console.error(error);
        }
    }

    displayCurrentEmail() {
        this.elements.emailDisplay.classList.remove('hidden');
        this.elements.emailAddr.value = this.currentEmail;
    }

    copyEmail() {
        this.elements.emailAddr.select();
        document.execCommand('copy');
        alert("Email copiata negli appunti!");
    }

    deleteEmail() {
        localStorage.removeItem('tempEmail');
        this.currentEmail = null;
        this.elements.emailDisplay.classList.add('hidden');
        this.elements.emailList.innerHTML = '';
        this.stopAutoRefresh();
    }

    async saveEmailToDB() {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_CONFIG.API_KEY
                },
                body: JSON.stringify({
                    email: this.currentEmail,
                    messages: [],
                    last_updated: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error(await response.text());
            
        } catch (error) {
            console.error("Errore nel salvataggio:", error);
            throw error;
        }
    }

    async checkEmails() {
        try {
            this.showLoading();
            
            const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.BIN_ID}/latest`, {
                headers: {
                    'X-Master-Key': JSONBIN_CONFIG.API_KEY
                }
            });

            if (!response.ok) throw new Error(await response.text());
            
            const data = await response.json();
            this.displayEmails(data.record.messages || []);
            
        } catch (error) {
            this.showError("Errore nel caricamento delle email");
            console.error(error);
        } finally {
            this.hideLoading();
        }
    }

    displayEmails(emails) {
        if (emails.length === 0) {
            this.elements.emailList.innerHTML = '<p class="empty">Nessuna email ricevuta</p>';
            return;
        }

        this.elements.emailList.innerHTML = emails
            .map(email => `
                <div class="email-item">
                    <div class="email-header">
                        <span class="sender">${email.from}</span>
                        <span class="date">${new Date(email.date).toLocaleString()}</span>
                    </div>
                    <div class="subject">${email.subject}</div>
                    <div class="preview">${email.content.substring(0, 100)}...</div>
                </div>
            `)
            .join('');
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => this.checkEmails(), UI_CONFIG.AUTO_REFRESH_INTERVAL);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    showLoading() {
        this.elements.loadingSpinner.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingSpinner.classList.add('hidden');
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
        setTimeout(() => this.elements.errorMessage.classList.add('hidden'), 5000);
    }
}

// Avvia l'applicazione
document.addEventListener('DOMContentLoaded', () => new TempMailApp());
