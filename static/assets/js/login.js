document.addEventListener("DOMContentLoaded", () => {
    initializeLoginFormFunctionality();
});

function initializeLoginFormFunctionality() {
    const elements = {
        loginForm: document.getElementById('loginForm'),
        formContent: document.getElementById('formContent'),
        tvSection: document.getElementById("tvSection"),
        checkIcon: document.getElementById("checkCircle"),
        formContainer: document.getElementById("formContainer"),
        longError: document.getElementById("loginError"),
    };

    elements.tvSection.style.display = "none";
    elements.checkIcon.style.display = "none";

    elements.loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission
        
        // Create FormData BEFORE disabling inputs
        const formData = new FormData(elements.loginForm);
        
        // Get the CSRF token from the form's hidden input field
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        // Change cursor to waiting during the request
        document.body.style.cursor = 'wait';
        elements.formContent.style.cursor = 'wait'; 
        elements.formContainer.style.cursor = 'wait';
        
        // NOW disable inputs after FormData is created
        const formInputs = elements.loginForm.querySelectorAll('input, button');
        formInputs.forEach(input => input.disabled = true);

        fetch(elements.loginForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrfToken
            },
        })
        .then(response => response.json()) // Always parse JSON
        .then(data => {
            if (data.success) {
                handleSuccess(data);
                // Note: We don't reset the cursor here as handleSuccess 
                // will manage the entire login success flow
            } else {
                displayError(data.message || "Invalid Username or Password.");
                // Reset cursor only on error
                resetCursorAndForm(formInputs);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayError("An unexpected error occurred.");
            // Reset cursor on error
            resetCursorAndForm(formInputs);
        });
    });

    function resetCursorAndForm(formInputs) {
        document.body.style.cursor = 'default';
        elements.formContent.style.cursor = 'default';
        elements.formContainer.style.cursor = 'default';
        
        // Re-enable form inputs
        formInputs.forEach(input => input.disabled = false);
    }

    function handleSuccess(data) {
        elements.formContent.style.display = "none";
        elements.tvSection.style.display = "flex";
        elements.formContainer.style.background = "linear-gradient(360deg, #ffffff, #000000, #059ea3)";
        
        cableOut();

        setTimeout(() => {
            elements.checkIcon.style.display = "block";
            document.getElementById("static-container").style.display = "none";
        }, 3000);

        setTimeout(() => {
            // Only reset the cursor right before navigating away
            document.body.style.cursor = 'default';
            elements.formContent.style.cursor = 'default';
            elements.formContainer.style.cursor = 'default';
            
            window.location.href = data.redirect_url;
        }, 5000);
    }

    function resetFormDisplay() {
        elements.formContent.style.display = "flex";
        elements.tvSection.style.display = "none";
        elements.formContainer.style.background = "linear-gradient(90deg, #ffffff, #1bd6da)";
    }

    function displayError(message) {
        elements.longError.textContent = message;
        elements.longError.style.display = "block";
    }
}

function cableOut() {
    const staticContainer = document.getElementById("static-container");

    // Generate multiple static lines
    for (let i = 0; i < 50; i++) {
        const line = document.createElement("div");
        line.classList.add("static-line");
        line.style.top = `${Math.random() * 100}%`;
        line.style.left = `${Math.random() * 70}%`;
        line.style.width = `${Math.random() * 50 + 50}%`; // Line width between 50% and 100%
        line.style.backgroundColor = Math.random() > 0.5 ? 'white' : 'gray';
        line.style.animationDuration = `${Math.random() * 0.5 + 0.1}s`;
        staticContainer.appendChild(line);
    }

    // Clean up static lines after 2 seconds
    setTimeout(() => {
        while (staticContainer.firstChild) {
            staticContainer.removeChild(staticContainer.firstChild);
        }
    }, 2000);
}

function getCookie(name) {
    const cookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}
