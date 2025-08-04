from django.db import models

# Create your models here.

class User(models.Model):
    ROLE_CHOICES = [
        ('student', 'Курсант'),
        ('teacher', 'Преподаватель'),
    ]

    last_name = models.CharField(max_length=100)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    group = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.last_name} {self.first_name} {self.middle_name or ''}"


class ScenarioHistory(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE)
    scenario_id = models.IntegerField()
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.FloatField(null=True, blank=True)  # в минутах
    status = models.CharField(max_length=20)  # started, completed, failed
    result = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'scenario_history'
        ordering = ['-start_time']

    def save(self, *args, **kwargs):
        if self.end_time and self.start_time:
            self.duration = (self.end_time - self.start_time).total_seconds() / 60
        super().save(*args, **kwargs)