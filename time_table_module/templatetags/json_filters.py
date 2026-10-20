from django import template
import json
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter(name='jsonify')
def jsonify(obj):
    """
    Converts a Python object to JSON string for use in JavaScript.
    Usage: {{ my_dict|jsonify }}
    """
    return mark_safe(json.dumps(obj))