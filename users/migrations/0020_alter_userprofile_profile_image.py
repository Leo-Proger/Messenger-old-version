# Generated by Django 4.2 on 2023-06-18 09:48

from django.db import migrations
import django_resized.forms
import users.models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0019_alter_userprofile_profile_image'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='profile_image',
            field=django_resized.forms.ResizedImageField(blank=True, crop=['middle', 'center'], default='/users/images/user_profile_images/default_user_avatar.jpg', force_format=None, keep_meta=True, quality=-1, scale=None, size=[1024, 1024], upload_to=users.models.get_user_image_path, verbose_name='Фотография'),
        ),
    ]
