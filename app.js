// Конфігурація OMDb API
const OMDB_API_KEY = 'b70853b4';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

// Клас для роботи з застосунком пошуку фільмів
class MovieSearchApp {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchSpinner = document.getElementById('searchSpinner');
        this.messageContainer = document.getElementById('messageContainer');
        this.moviesGrid = document.getElementById('moviesGrid');
        this.pagination = document.getElementById('pagination');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.pageInfo = document.getElementById('pageInfo');
        this.movieModal = document.getElementById('movieModal');
        this.modalClose = document.getElementById('modalClose');
        this.modalBody = document.getElementById('modalBody');

        this.currentSearch = '';
        this.currentPage = 1;
        this.totalResults = 0;
        this.searchTimeout = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.showWelcomeMessage();
    }

    bindEvents() {
        // LiveSearch з затримкою
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            if (query.length === 0) {
                this.clearResults();
                this.showWelcomeMessage();
                return;
            }

            if (query.length < 2) {
                return;
            }

            this.searchTimeout = setTimeout(() => {
                this.performSearch(query, 1);
            }, 500); // Затримка 500мс для оптимізації запитів
        });

        // Пагінація
        this.prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.performSearch(this.currentSearch, this.currentPage);
            }
        });

        this.nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this.totalResults / 10);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.performSearch(this.currentSearch, this.currentPage);
            }
        });

        // Модальне вікно
        this.modalClose.addEventListener('click', () => {
            this.closeModal();
        });

        this.movieModal.addEventListener('click', (e) => {
            if (e.target === this.movieModal) {
                this.closeModal();
            }
        });

        // Закриття модального вікна на ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.movieModal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    async performSearch(query, page = 1) {
        if (!query || query.trim().length < 2) return;

        this.currentSearch = query.trim();
        this.currentPage = page;

        this.showSpinner(true);
        this.clearResults();

        try {
            const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&page=${page}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.showSpinner(false);

            if (data.Response === 'True') {
                this.displayResults(data.Search);
                this.totalResults = parseInt(data.totalResults);
                this.updatePagination();
                this.hideMessage();
            } else {
                this.showNoResults(data.Error);
                this.hidePagination();
            }
        } catch (error) {
            this.showSpinner(false);
            console.error('Search error:', error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showError('Помилка мережі. Перевірте підключення до інтернету.');
            } else if (error.message.includes('HTTP error')) {
                this.showError(`Помилка сервера: ${error.message}`);
            } else {
                this.showError('Помилка підключення до сервера. Спробуйте пізніше.');
            }
        }
    }

    async getMovieDetails(imdbId) {
        try {
            const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.Response === 'True') {
                this.showMovieModal(data);
            } else {
                this.showError('Не вдалося завантажити деталі фільму');
            }
        } catch (error) {
            this.showError('Помилка завантаження деталей фільму');
            console.error('Movie details error:', error);
        }
    }

    displayResults(movies) {
        this.moviesGrid.innerHTML = '';

        movies.forEach((movie, index) => {
            const movieCard = this.createMovieCard(movie);
            movieCard.style.animationDelay = `${index * 0.1}s`;
            this.moviesGrid.appendChild(movieCard);
        });
    }

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.addEventListener('click', () => {
            this.getMovieDetails(movie.imdbID);
        });

        const poster = movie.Poster !== 'N/A'
            ? `<img src="${movie.Poster}" alt="${movie.Title}" class="movie-poster" loading="lazy">`
            : `<div class="poster-placeholder">
                <i class="fas fa-film"></i>
               </div>`;

        card.innerHTML = `
            ${poster}
            <div class="movie-info">
                <h3 class="movie-title">${movie.Title}</h3>
                <p class="movie-year">${movie.Year}</p>
                <span class="movie-type">${this.translateType(movie.Type)}</span>
            </div>
        `;

        return card;
    }

    showMovieModal(movie) {
        const ratings = this.formatRatings(movie.Ratings || []);
        const posterSrc = movie.Poster !== 'N/A' ? movie.Poster : '';

        this.modalBody.innerHTML = `
            <div class="modal-movie-details">
                <div class="modal-header">
                    ${posterSrc ? `<img src="${posterSrc}" alt="${movie.Title}" class="modal-poster">` :
                '<div class="poster-placeholder modal-poster"><i class="fas fa-film"></i></div>'}
                    <div class="modal-info">
                        <h2>${movie.Title}</h2>
                        <div class="movie-meta">
                            <span class="meta-item"><i class="fas fa-calendar"></i> ${movie.Year}</span>
                            <span class="meta-item"><i class="fas fa-clock"></i> ${movie.Runtime || 'N/A'}</span>
                            <span class="meta-item"><i class="fas fa-tag"></i> ${this.translateType(movie.Type)}</span>
                            <span class="meta-item"><i class="fas fa-star"></i> ${movie.Genre || 'N/A'}</span>
                        </div>
                        ${ratings.length > 0 ? `
                            <div class="modal-rating">
                                ${ratings.map(rating => `
                                    <div class="rating-item">
                                        <span class="rating-value">${rating.Value}</span>
                                        <span class="rating-source">${rating.Source}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${movie.Director && movie.Director !== 'N/A' ?
                `<p><strong>Режисер:</strong> ${movie.Director}</p>` : ''}
                        ${movie.Actors && movie.Actors !== 'N/A' ?
                `<p><strong>Актори:</strong> ${movie.Actors}</p>` : ''}
                    </div>
                </div>
                ${movie.Plot && movie.Plot !== 'N/A' ? `
                    <div class="modal-plot">
                        <h3>Опис</h3>
                        <p>${movie.Plot}</p>
                    </div>
                ` : ''}
            </div>
        `;

        this.movieModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.movieModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    formatRatings(ratings) {
        return ratings.filter(rating =>
            rating.Source && rating.Value && rating.Value !== 'N/A'
        ).slice(0, 3); // Максимум 3 рейтинги
    }

    translateType(type) {
        const translations = {
            'movie': 'Фільм',
            'series': 'Серіал',
            'episode': 'Епізод',
            'game': 'Гра'
        };
        return translations[type.toLowerCase()] || type;
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalResults / 10);

        if (totalPages <= 1) {
            this.hidePagination();
            return;
        }

        this.pagination.style.display = 'flex';
        this.pageInfo.textContent = `Сторінка ${this.currentPage} з ${totalPages}`;

        this.prevBtn.disabled = this.currentPage === 1;
        this.nextBtn.disabled = this.currentPage === totalPages;
    }

    showSpinner(show) {
        if (show) {
            this.searchSpinner.classList.remove('hidden');
        } else {
            this.searchSpinner.classList.add('hidden');
        }
    }

    clearResults() {
        this.moviesGrid.innerHTML = '';
    }

    showWelcomeMessage() {
        this.messageContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-search"></i>
                <h3>Розпочніть пошук</h3>
                <p>Введіть назву фільму або серіалу, щоб побачити результати</p>
            </div>
        `;
        this.messageContainer.style.display = 'block';
    }

    showNoResults(errorMessage = '') {
        const message = errorMessage === 'Movie not found!'
            ? 'Фільми не знайдено. Спробуйте інший запит.'
            : errorMessage;

        this.messageContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Нічого не знайдено</h3>
                <p>${message}</p>
            </div>
        `;
        this.messageContainer.style.display = 'block';
    }

    showError(message) {
        this.messageContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Помилка</h3>
                <p>${message}</p>
            </div>
        `;
        this.messageContainer.style.display = 'block';
    }

    hideMessage() {
        this.messageContainer.style.display = 'none';
    }

    hidePagination() {
        this.pagination.style.display = 'none';
    }
}

// Динамічне створення додаткових елементів інтерфейсу
class UIEnhancer {
    static addScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
            display: none;
        `;

        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.style.display = 'block';
                setTimeout(() => scrollBtn.style.opacity = '1', 10);
            } else {
                scrollBtn.style.opacity = '0';
                setTimeout(() => scrollBtn.style.display = 'none', 300);
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Ініціалізація застосунку після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    // Створення основного застосунку
    const app = new MovieSearchApp();

    // Додавання додаткових UI елементів
    UIEnhancer.addScrollToTop();

    // Додавання обробника помилок для зображень
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('movie-poster')) {
            e.target.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'poster-placeholder';
            placeholder.innerHTML = '<i class="fas fa-film"></i>';
            e.target.parentNode.insertBefore(placeholder, e.target);
        }
    }, true);

    console.log('Movie Search App ініціалізовано успішно!');
});