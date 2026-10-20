from django import template

register = template.Library()

@register.filter(name='replace_underscore')
def replace_underscore(value, arg="_"):
    """Replaces all occurrences of arg with a space"""
    return value.replace(arg, " ")