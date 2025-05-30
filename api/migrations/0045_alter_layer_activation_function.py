# Generated by Django 4.2.16 on 2025-03-27 17:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0044_alter_model_loss_function_alter_model_optimizer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='layer',
            name='activation_function',
            field=models.CharField(blank=True, choices=[('relu', 'ReLU'), ('softmax', 'Softmax'), ('sigmoid', 'Sigmoid')], default='', max_length=100),
        ),
    ]
