from django.contrib.sitemaps import Sitemap
from django.urls import reverse

class StaticViewSitemap(Sitemap):
    def items(self):
        return ['home', 'about', 'contact']  # Use your actual view names

    def location(self, item):
        return reverse(item)