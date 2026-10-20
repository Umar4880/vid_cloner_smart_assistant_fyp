// Global variables to track the validity of the form
let validPassword = false;
let validEmail = false;
let validFirstName = false;
let validLastName = false;
let validConfirmPassword = false;

document.addEventListener("DOMContentLoaded", () => {
    initializeFormSubmission();
    initializePasswordChecking();
});

function initializeFormSubmission() {
    const registerForm = document.querySelector('.register-form');
    const signupError = document.getElementById('signupError');
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('regConfirmPassword');
    
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Clear previous error messages
        signupError.textContent = '';
        signupError.style.display = 'none';

        // Perform validation on submit
        if (!initializeNameChecking()) {
            displaySignupError(["First Name should be valid. It cannot start with a number or be just numbers."]);
            return;
        }

        if (!initializeEmailChecking()) {
            displaySignupError(["Email is not valid. Please enter a correct email address."]);
            return;
        }

        if (!validPassword) {
            displaySignupError(["Password must fulfill the listed conditions (e.g., uppercase, lowercase, number, special character, etc.)."]);
            return;
        }

        if (passwordInput.value.trim() !== confirmPasswordInput.value.trim()) {
            displaySignupError(["Password and Confirm Password do not match."]);
            return;
        }

        // Change cursor to waiting during the request
        document.body.style.cursor = 'wait';

        const formData = new FormData(registerForm);
        
        fetch(registerForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Successful signup - handle success (e.g., redirect)
                signupError.style.color = "green";
                displaySignupError(["Registered successfully! Now please login to get started."]);
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 3000);
            } else {
                // If server returns error message (e.g., password mismatch, email already taken)
                displaySignupError([data.message || 'An unexpected error occurred.']);
            }
        })
        .catch(error => {
            console.log('Error:', error);
            displaySignupError(['An unexpected error occurred.']);
        })
        .finally(() => {
            // Reset cursor back to normal when the response is received
            document.body.style.cursor = 'default';
            signupError.style.color="red";
        });
    });
}

function initializeNameChecking() {
    const firstNameInput = document.getElementById('regFirstName');
    const lastNameInput = document.getElementById('regLastName');
    
    // Updated regex to be more flexible with names
    // Allows letters, spaces, hyphens and apostrophes (for names like O'Brien, Smith-Johnson)
    // Only checks that names aren't empty and don't start with numbers
    const nameRegex = /^[a-zA-Z][a-zA-Z\s'\-]*$/;
    
    validFirstName = nameRegex.test(firstNameInput.value.trim()) && firstNameInput.value.trim() !== '';
    validLastName = nameRegex.test(lastNameInput.value.trim()) && lastNameInput.value.trim() !== '';

    return validFirstName && validLastName;
}

function initializeEmailChecking() {
    const emailInput = document.getElementById('regEmail');
    
    // Regular expression to validate the email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Check if the email matches the regex
    validEmail = emailRegex.test(emailInput.value);
    return validEmail;
}

function initializePasswordChecking() {
    const passwordInput = document.getElementById('regPassword');
    
    // Regular expressions for each password criteria
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /\d/;
    const specialCharRegex = /[@$!%*?&]/;
    const lengthRegex = /.{8,}/;

    // Listen for input changes in the password field
    passwordInput.addEventListener('input', function () {
        const password = passwordInput.value;

        // Check each password criteria
        validPassword = 
            uppercaseRegex.test(password) &&
            lowercaseRegex.test(password) &&
            numberRegex.test(password) &&
            specialCharRegex.test(password) &&
            lengthRegex.test(password);

        // Update criteria visualization
        toggleCriteria('uppercase', uppercaseRegex.test(password));
        toggleCriteria('lowercase', lowercaseRegex.test(password));
        toggleCriteria('number', numberRegex.test(password));
        toggleCriteria('special', specialCharRegex.test(password));
        toggleCriteria('length', lengthRegex.test(password));

    });

    function toggleCriteria(id, isValid) {
        const element = document.getElementById(id);
        if (isValid) {
            element.classList.add('met');
        } else {
            element.classList.remove('met');
        }
    }
}

function displaySignupError(errors) {
    const signupError = document.getElementById('signupError');
    
    // Join all error messages into a single string, separated by newlines
    signupError.textContent = errors.join('\n');
    signupError.style.display = 'block';
}

function getCookie(name) {
    const cookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}
