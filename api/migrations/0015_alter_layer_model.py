# Generated by Django 4.2.16 on 2025-02-17 12:37

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_alter_layer_model'),
    ]

    operations = [
        migrations.AlterField(
            model_name='layer',
            name='model',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='layers', to='api.model'),
        ),
    ]
