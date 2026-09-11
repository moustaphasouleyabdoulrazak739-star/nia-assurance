from django.urls import path
from .views import JournalListView

urlpatterns = [
    path('', JournalListView.as_view(), name='journal_list'),
]
