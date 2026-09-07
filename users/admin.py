from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'nom', 'prenom', 'role', 'is_active', 'is_staff', 'date_creation')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'nom', 'prenom')
    ordering = ('email',)
    filter_horizontal = ('groups', 'user_permissions')

    fieldsets = (
        ('Identifiants', {'fields': ('email', 'password')}),
        ('Informations personnelles', {'fields': ('nom', 'prenom', 'telephone')}),
        ('Rôle et permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('date_creation', 'last_login')}),
    )
    readonly_fields = ('password', 'date_creation', 'last_login')
