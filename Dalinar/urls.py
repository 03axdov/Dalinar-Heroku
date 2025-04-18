from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from frontend.sitemaps import StaticViewSitemap
from django.contrib.sitemaps.views import sitemap
from django.http import HttpResponse

def robots_txt(request):
    content = "User-agent: *\nDisallow:\nSitemap: https://yourdomain.com/sitemap.xml"
    return HttpResponse(content, content_type="text/plain")

sitemaps = {
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("api.urls")),
    path("accounts/", include("allauth.urls")),
    path("", include("frontend.urls")),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]