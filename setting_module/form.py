from django import forms
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

class ChangeNameForm(forms.Form):
    username = forms.CharField(max_length=100, required=True)

class ChangeEmailForm(forms.Form):
    email = forms.EmailField(required=True)

    def clean_email(self):
        email = self.cleaned_data.get('email')
        # Additional email validation if needed
        return email
