// Constants
const API_ENDPOINT = 'http://127.0.0.1:5000/recommend_resource';
const MAX_TEXTAREA_LINES = 5;
const MOBILE_BREAKPOINT = 768; // Mobile breakpoint in pixels

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeRecommendationSystem);

// Core recommendation system functionality
function initializeRecommendationSystem() {
    const elements = {
        form: document.getElementById('recommenderForm'),
        input: document.getElementById('userInput'),
        output: document.getElementById('outputTextarea'),
        outputContainer: document.getElementById('outputContainer'),
        recommendationsContainer: document.getElementById('recommendations'),
        booksContainer: document.getElementById('booksContainer'),
        bookTemplate: document.querySelector('.book-template'),
        waitingPlaceholder: document.getElementById('waitingPlaceholder'),
        welcomeSection: document.getElementById('welcomeSection'),
        bookDetailModal: document.getElementById('bookDetailModal'),
        modalBookTitle: document.getElementById('modalBookTitle'),
        modalBookAuthor: document.getElementById('modalBookAuthor'),
        modalBookDescription: document.getElementById('modalBookDescription'),
        modalBookRating: document.getElementById('modalBookRating')
    };

    if (!validateElements(elements)) {
        console.error('Required elements not found in the DOM');
        return;
    }

    setupUI(elements);
    setupEventListeners(elements);
    handleResponsiveLayout();
    
    // Add resize listener for responsive adaptations
    window.addEventListener('resize', () => handleResponsiveLayout());
}

// Validate required DOM elements
function validateElements(elements) {
    return Object.values(elements).every(element => element !== null);
}

// Setup UI and event listeners
function setupUI(elements) {
    // Show welcome section initially, hide other content sections
    elements.welcomeSection.style.display = "flex";
    elements.outputContainer.style.display = "none";
    elements.waitingPlaceholder.style.display = "none";
    elements.recommendationsContainer.style.display = "none";
    
    // Setup input textarea
    adjustInputTextareaHeight(elements.input);
    elements.input.addEventListener("input", () => adjustInputTextareaHeight(elements.input));
    
    // Set focus on the input field when the page loads
    setTimeout(() => {
        elements.input.focus();
    }, 300); // Small delay to ensure the element is fully loaded
}

function setupEventListeners(elements) {
    elements.form.addEventListener('submit', (event) => handleFormSubmit(event, elements));
    elements.input.addEventListener('input', () => {
        adjustInputTextareaHeight(elements.input);
        // Hide welcome section as soon as user starts typing
        if (elements.input.value.trim()) {
            hideWelcomeSection(elements);
        }
    });
    elements.input.addEventListener('keydown', (event) => handleKeyPress(event, elements));
    
    // Add touch events for better mobile experience
    if ('ontouchstart' in window) {
        setupTouchEvents(elements);
    }
    
    // Focus on input field should hide welcome message if there's text
    elements.input.addEventListener('focus', () => {
        if (elements.input.value.trim()) {
            hideWelcomeSection(elements);
        }
    });
}

// Handle responsive layout changes
function handleResponsiveLayout() {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    
    // Adjust book card sizes for different screen widths
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        if (isMobile) {
            card.style.width = '100%';
        }
    });
    
    // Adjust input text area max height based on screen size
    const inputElement = document.getElementById('userInput');
    if (inputElement) {
        inputElement.style.maxHeight = isMobile ? '80px' : '120px';
    }
    
    // Adjust modal display for smaller screens
    const modalDialog = document.querySelector('.modal-dialog');
    if (modalDialog) {
        if (isMobile) {
            modalDialog.style.margin = '0.5rem';
            modalDialog.style.maxWidth = 'none';
        } else {
            modalDialog.style.margin = '1.75rem auto';
            modalDialog.style.maxWidth = '600px';
        }
    }
}

// Setup touch events for mobile devices
function setupTouchEvents(elements) {
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });
        
        card.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    });
}

// Initialize textarea
function initializeTextarea(textarea) {
    textarea.value = '';
    adjustInputTextareaHeight(textarea);
}

// Handle keyboard events
function handleKeyPress(event, elements) {
    // On mobile, allow multiline input
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    
    // Hide welcome section when user starts typing
    if (elements.input.value.trim()) {
        hideWelcomeSection(elements);
    }
    
    if (event.key === 'Enter') {
        if (event.shiftKey || isMobile) {
            // Allow new line with Shift+Enter on desktop or any Enter on mobile
            return;
        } else {
            // Submit form with Enter on desktop
            event.preventDefault();
            const inputText = elements.input.value.trim();
            if (inputText) {
                handleFormSubmit(new Event('submit'), elements);
            }
        }
    }
}

// Hide welcome section
function hideWelcomeSection(elements) {
    if (elements.welcomeSection && elements.welcomeSection.style.display !== 'none') {
        elements.welcomeSection.style.display = 'none';
    }
}

// Form submission handler
async function handleFormSubmit(event, elements) {
    // Explicitly prevent default submission behavior
    if (event) {
        event.preventDefault();
    }
    
    const inputText = elements.input.value.trim();

    if (!inputText) {
        alert("Please enter some text before submitting.");
        return;
    }

    try {
        // Hide welcome section immediately when form is submitted
        hideWelcomeSection(elements);
        
        // Show waiting animation
        showWaitingState(elements, inputText);
        
        console.log("Sending request with text:", inputText);
        const response = await fetchRecommendations(inputText);
        console.log("Response received:", response);
        
        // Update UI with recommendations
        updateUI(response, elements);
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to fetch recommendations. Please try again.');
    } finally {
        hideWaitingAnimation(elements);
    }
}

// UI state management
function showWaitingState(elements, inputText) {
    // Make sure welcome section is hidden
    hideWelcomeSection(elements);
    
    // Show output and waiting animation
    elements.output.textContent = inputText;
    elements.outputContainer.style.display = 'block';
    elements.waitingPlaceholder.style.display = 'flex';
    elements.recommendationsContainer.style.display = 'none';
    
    // Scroll to top for better visibility of waiting animation
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideWaitingAnimation(elements) {
    elements.waitingPlaceholder.style.display = 'none';
    elements.outputContainer.style.display = 'block';
}

function showError(message) {
    // Show more user-friendly error on mobile
    if (window.innerWidth < MOBILE_BREAKPOINT) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = message;
        document.body.appendChild(errorContainer);
        
        setTimeout(() => {
            errorContainer.classList.add('show');
            setTimeout(() => {
                errorContainer.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(errorContainer);
                }, 300);
            }, 3000);
        }, 10);
    } else {
        alert(message);
    }
}

// API interaction
async function fetchRecommendations(inputText) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ query: inputText }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Network error:', error);
        throw new Error('Network error, please check your connection and try again.');
    }
}

// UI updates
function updateUI(response, elements) {
    // Always ensure welcome is hidden
    hideWelcomeSection(elements);
    
    updateOutput(elements);
    updateRecommendations(response.recommendations, elements.booksContainer, elements.bookTemplate, elements);
    elements.recommendationsContainer.style.display = 'block';
    resetInput(elements.input);
    
    // Smooth scroll to recommendations on mobile
    if (window.innerWidth < MOBILE_BREAKPOINT) {
        setTimeout(() => {
            elements.recommendationsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
}

function updateOutput(elements) {
    elements.output.textContent = elements.input.value;
    elements.outputContainer.style.display = 'block';
}

function resetInput(input) {
    input.value = '';
    adjustInputTextareaHeight(input);
    input.focus(); // Keep focus on input for better UX
}

function updateRecommendations(books, container, template, elements) {
    container.innerHTML = '';
    
    if (!books?.length) {
        // More informative "no books found" message with better styling
        container.innerHTML = `
            <div class="no-results-container">
                <i class="bi bi-search-heart" style="font-size: 3rem; color: #059ea3; margin-bottom: 1rem;"></i>
                <p class="no-results">No books match your search criteria.</p>
                <p class="no-results-suggestion">Try modifying your search terms or explore a different topic.</p>
                <ul class="suggestion-examples">
                    <li>Be more specific about genres or themes</li>
                    <li>Try using different keywords</li>
                    <li>Search for a popular author or book series</li>
                </ul>
            </div>
        `;
        return;
    }

    books.forEach(book => {
        const bookElement = createBookElement(book, template, elements);
        container.appendChild(bookElement);
    });
    
    // Initialize responsive layout for newly created book elements
    handleResponsiveLayout();
}

// Book element creation
function createBookElement(book, template, elements) {
    const bookElement = template.cloneNode(true);
    bookElement.style.display = 'block';
    
    updateBookDetails(bookElement, book);
    bookElement.addEventListener('click', () => showBookModal(book, elements));
    
    // Add touch feedback for mobile
    if ('ontouchstart' in window) {
        bookElement.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });
        
        bookElement.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    }
    
    return bookElement;
}

function updateBookDetails(element, book) {
    // Safely update text content with fallbacks for missing data
    const titleEl = element.querySelector('[data-book-title]');
    const descEl = element.querySelector('[data-book-description]');
    const authorEl = element.querySelector('[data-book-author]');
    const ratingEl = element.querySelector('[data-book-publisher]');
    
    if (titleEl) titleEl.textContent = book.name || "Unknown Title";
    
    if (descEl) {
        const summary = book.summary || "No description available";
        // Limit description length for smaller screens
        const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
        descEl.innerHTML = `<strong>Description:</strong> ${isMobile ? truncateText(summary, 60) : truncateText(summary, 120)}`;
    }
    
    if (authorEl) authorEl.innerHTML = `<strong>Author:</strong> ${book.author || "Unknown Author"}`;
    if (ratingEl) ratingEl.innerHTML = `<strong>Rating:</strong> ${book.star_rating || "Not rated"}`;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Book Details Modal
function showBookModal(book, elements) {
    // Format and set content
    elements.modalBookTitle.textContent = book.name || "Unknown Title";
    elements.modalBookAuthor.textContent = book.author || "Unknown Author";
    elements.modalBookDescription.textContent = book.summary || "No description available";
    
    // Generate star rating display with better formatting
    if (book.star_rating) {
        const rating = parseFloat(book.star_rating);
        let starsHtml = '<div class="star-rating">';
        
        if (!isNaN(rating)) {
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            
            // Add full stars
            for (let i = 0; i < fullStars; i++) {
                starsHtml += '<i class="bi bi-star-fill"></i>';
            }
            
            // Add half star if needed
            if (hasHalfStar) {
                starsHtml += '<i class="bi bi-star-half"></i>';
            }
            
            // Add empty stars
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            for (let i = 0; i < emptyStars; i++) {
                starsHtml += '<i class="bi bi-star"></i>';
            }
            
            starsHtml += `<span class="star-value">${rating.toFixed(1)}</span>`;
        } else {
            starsHtml += 'No rating available';
        }
        
        starsHtml += '</div>';
        elements.modalBookRating.innerHTML = starsHtml;
    } else {
        elements.modalBookRating.innerHTML = '<div class="star-rating">No rating available</div>';
    }
    
    // Initialize modal using Bootstrap 5 syntax
    const bookModal = new bootstrap.Modal(document.getElementById('bookDetailModal'));
    bookModal.show();

    // Ensure the X button works
    document.querySelector('#bookDetailModal .btn-close').onclick = function() {
        bookModal.hide();
    };
    
    // Add swipe gesture for closing modal on mobile
    if ('ontouchstart' in window) {
        setupModalSwipeGesture(document.getElementById('bookDetailModal'), bookModal);
    }
}

// Add swipe to close for mobile
function setupModalSwipeGesture(modalElement, modalInstance) {
    let touchStartY = 0;
    let touchEndY = 0;
    
    modalElement.addEventListener('touchstart', function(e) {
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    modalElement.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe(modalInstance);
    }, false);
    
    function handleSwipe(modal) {
        if (touchEndY - touchStartY > 100) { // Swipe down gesture
            modal.hide();
        }
    }
}

// Textarea height management
function adjustInputTextareaHeight(textarea) {
    if (!textarea) return;
    
    textarea.style.height = '40px';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    
    // Adjust max height based on screen size
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const maxLines = isMobile ? 3 : MAX_TEXTAREA_LINES;
    const maxHeight = lineHeight * maxLines;
    
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
    
    textarea.style.height = `${scrollHeight}px`;
    textarea.style.overflowY = scrollHeight === maxHeight ? 'scroll' : 'hidden';
}

// Utility functions
function getCookie(name) {
    if (!document.cookie) return null;

    return document.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith(`${name}=`))
        ?.substring(name.length + 1)
        ?.trim();
}

