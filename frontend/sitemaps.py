from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Dataset, Model  # adjust path as needed

class DatasetSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return Dataset.objects.filter(visibility='public')  # only index public datasets

    def location(self, obj):
        return f"/datasets/public/{obj.id}/"

class ModelSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.7

    def items(self):
        return Model.objects.filter(visibility="public")

    def location(self, obj):
        return f"/models/public/{obj.id}/"
    

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