from datetime import date


def generate_numero(model, field_name, prefix):
    """Genere une reference sequentielle du type PREFIX-ANNEE-0001."""
    annee = date.today().year
    base = f"{prefix}-{annee}-"
    count = model.objects.filter(**{f"{field_name}__startswith": base}).count()
    return f"{base}{count + 1:04d}"
