from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from frontend.sitemaps import StaticViewSitemap
from django.contrib.sitemaps.views import sitemap
from django.http import HttpResponse

sitemaps = {
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("api.urls")),
    path("accounts/", include("allauth.urls")),
    path('sitemap.xml/', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path("", include("frontend.urls")),
]