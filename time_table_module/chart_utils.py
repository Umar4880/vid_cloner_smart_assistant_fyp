import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
from datetime import datetime, timedelta
from django.utils import timezone
from .models import DailyProgress, WeeklyProgress

def get_daily_progress_chart(user):
    """Generate a bar chart visualization for daily progress of the last 7 days"""
    # Setup figure and axes
    fig, ax = plt.subplots(figsize=(8, 4))
    
    # Get current date and dates for the past 7 days
    today = timezone.now().date()
    dates = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    date_labels = [date.strftime('%a %d') for date in dates]
    
    # Get completion percentages for each day
    completion_percentages = []
    for day_date in dates:
        try:
            daily_progress = DailyProgress.objects.get(user=user, date=day_date)
            completion_percentages.append(daily_progress.completion_percentage)
        except DailyProgress.DoesNotExist:
            completion_percentages.append(0)
    
    # Create bar chart with gradient colors based on completion value
    bars = ax.bar(date_labels, completion_percentages, color='skyblue', edgecolor='navy', alpha=0.7)
    
    # Color the bars according to completion percentage
    for i, bar in enumerate(bars):
        percentage = completion_percentages[i]
        if percentage > 80:
            bar.set_color('#28a745')  # Green for high completion
        elif percentage > 50:
            bar.set_color('#007bff')  # Blue for medium completion
        else:
            bar.set_color('#ffc107')  # Yellow for low completion
    
    # Add completion values on top of each bar
    for i, v in enumerate(completion_percentages):
        ax.text(i, v + 3, f"{v:.1f}%", ha='center', fontweight='bold', fontsize=9)
    
    # Set labels and title
    ax.set_ylim(0, 105)  # Set y-axis limit with space for text
    ax.set_ylabel('Completion Percentage (%)')
    ax.set_title('Daily Study Progress (Last 7 Days)')
    
    # Add grid for better readability
    ax.grid(axis='y', linestyle='--', alpha=0.7)
    
    # Adjust layout
    plt.tight_layout()
    
    # Convert plot to base64 string
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100)
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    
    graphic = base64.b64encode(image_png).decode('utf-8')
    
    return f"data:image/png;base64,{graphic}"

def get_weekly_progress_chart(user):
    """Generate a pie chart visualization for weekly progress"""
    # Get current week's progress
    current_week_progress = WeeklyProgress.get_current_week_progress(user)
    completed = current_week_progress.completed_slots
    remaining = current_week_progress.total_slots - completed
    
    # Create figure and axis
    fig, ax = plt.subplots(figsize=(6, 6))
    
    # Define data
    labels = ['Completed', 'Remaining']
    sizes = [completed, remaining if remaining > 0 else 0.001]  # Avoid empty pie
    colors = ['#28a745', '#e9ecef']
    explode = (0.1, 0)  # explode the 1st slice (Completed)
    
    # Plot pie chart
    ax.pie(sizes, explode=explode, labels=labels, colors=colors,
           autopct='%1.1f%%', shadow=True, startangle=90, textprops={'fontweight': 'bold'})
    
    # Equal aspect ratio ensures that pie is drawn as a circle
    ax.axis('equal')
    
    # Add title
    plt.title(f"Weekly Completion: {completed}/{current_week_progress.total_slots} Sessions", fontweight='bold')
    
    # Convert plot to base64 string
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100, transparent=True)
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    
    graphic = base64.b64encode(image_png).decode('utf-8')
    
    return f"data:image/png;base64,{graphic}"

def get_course_progress_chart(user):
    """Generate a horizontal bar chart for progress by course"""
    from django.db.models import Count, Q
    from .models import TimeTableEntry, Course
    
    # Get current date and dates for the past 7 days
    today = timezone.now().date()
    seven_days_ago = today - timedelta(days=6)
    
    # Get all courses
    courses = Course.objects.filter(user=user)
    
    if not courses.exists():
        # Return empty chart if no courses exist
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.text(0.5, 0.5, "No courses found", ha='center', va='center', fontsize=14)
        ax.axis('off')
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100)
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        plt.close(fig)
        
        graphic = base64.b64encode(image_png).decode('utf-8')
        return f"data:image/png;base64,{graphic}"
    
    # Get data for each course
    course_names = []
    completed_counts = []
    total_counts = []
    
    for course in courses:
        course_names.append(course.name)
        
        # Get entries for this course in the last 7 days
        entries = TimeTableEntry.objects.filter(
            user=user,
            course=course,
            date__gte=seven_days_ago,
            date__lte=today
        )
        
        total = entries.count()
        completed = entries.filter(status='completed').count()
        
        total_counts.append(total)
        completed_counts.append(completed)
    
    # Create horizontal bar chart
    fig, ax = plt.subplots(figsize=(8, max(4, len(courses) * 0.6)))
    
    # Plot bars
    y_pos = np.arange(len(course_names))
    
    # Plot total sessions
    ax.barh(y_pos, total_counts, color='#e9ecef', edgecolor='gray', alpha=0.7, label='Total Sessions')
    
    # Plot completed sessions
    ax.barh(y_pos, completed_counts, color='#007bff', edgecolor='navy', alpha=0.7, label='Completed Sessions')
    
    # Add course names and values
    ax.set_yticks(y_pos)
    ax.set_yticklabels(course_names)
    
    # Add completion percentage text
    for i, (total, completed) in enumerate(zip(total_counts, completed_counts)):
        percentage = (completed / total * 100) if total > 0 else 0
        ax.text(total + 0.5, i, f"{percentage:.1f}%", va='center', fontweight='bold')
    
    # Set labels and title
    ax.set_xlabel('Number of Sessions')
    ax.set_title('Course Progress (Last 7 Days)')
    
    # Add legend
    ax.legend()
    
    # Add grid
    ax.grid(axis='x', linestyle='--', alpha=0.7)
    
    # Adjust layout
    plt.tight_layout()
    
    # Convert plot to base64 string
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=100)
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    plt.close(fig)
    
    graphic = base64.b64encode(image_png).decode('utf-8')
    
    return f"data:image/png;base64,{graphic}"