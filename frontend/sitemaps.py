from django.contrib.sitemaps import Sitemap
from django.urls import reverse

class StaticViewSitemap(Sitemap):
    def items(self):
        return ['home', 'landing', 'explore', "guide"]

    def location(self, item):
        url_mapping = {
            'home': '/home/',
            'landing': '/',
            'explore': '/explore/',
            'guide': '/guide/',
        }
        return url_mapping.get(item)