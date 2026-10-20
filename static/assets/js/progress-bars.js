document.addEventListener('DOMContentLoaded', function() {
    // Weekly progress animation
    const weeklyProgressBar = document.getElementById('weeklyProgressBar');
    const weeklyCompletionText = document.getElementById('weeklyCompletionText');
    
    if (weeklyProgressBar) {
        // Get weekly progress data from the page (passed from Django)
        const weeklyData = JSON.parse(document.getElementById('weekly-progress-data').textContent);
        const weeklyPercentage = weeklyData.completion_percentage || 0;
        
        // Update weekly progress bar
        setTimeout(() => {
            weeklyProgressBar.style.width = weeklyPercentage + '%';
            weeklyProgressBar.setAttribute('aria-valuenow', weeklyPercentage);
            weeklyProgressBar.textContent = weeklyPercentage.toFixed(1) + '%';
            
            // Set color based on percentage
            if (weeklyPercentage > 80) {
                weeklyProgressBar.className = 'progress-bar bg-success';
            } else if (weeklyPercentage > 50) {
                weeklyProgressBar.className = 'progress-bar bg-primary';
            } else {
                weeklyProgressBar.className = 'progress-bar bg-warning';
            }
            
            // Update completion text
            if (weeklyCompletionText) {
                weeklyCompletionText.textContent = `${weeklyData.completed_slots} / ${weeklyData.total_slots} sessions`;
            }
        }, 300);
    }
    
    // Daily progress animations
    const dailyProgressContainer = document.getElementById('dailyProgressContainer');
    
    if (dailyProgressContainer) {
        // Get daily progress data from the page
        const dailyData = JSON.parse(document.getElementById('daily-progress-data').textContent);
        
        if (dailyData && dailyData.length > 0) {
            // Clear loading message
            dailyProgressContainer.innerHTML = '';
            
            // Add progress bars for each day
            dailyData.forEach((day, index) => {
                const dayElement = document.createElement('div');
                dayElement.className = 'mb-3';
                
                const headerDiv = document.createElement('div');
                headerDiv.className = 'd-flex justify-content-between';
                
                const dateHeading = document.createElement('h5');
                dateHeading.textContent = day.date;
                
                const sessionCount = document.createElement('span');
                sessionCount.textContent = `${day.completed_slots} / ${day.total_slots} sessions`;
                
                headerDiv.appendChild(dateHeading);
                headerDiv.appendChild(sessionCount);
                
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress';
                progressContainer.style.height = '20px';
                
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.role = 'progressbar';
                progressBar.style.width = '0%';
                progressBar.setAttribute('aria-valuenow', 0);
                progressBar.setAttribute('aria-valuemin', 0);
                progressBar.setAttribute('aria-valuemax', 100);
                
                progressContainer.appendChild(progressBar);
                dayElement.appendChild(headerDiv);
                dayElement.appendChild(progressContainer);
                dailyProgressContainer.appendChild(dayElement);
                
                // Animate the progress bar after a delay
                setTimeout(() => {
                    const percentage = day.completion_percentage || 0;
                    progressBar.style.width = percentage + '%';
                    progressBar.setAttribute('aria-valuenow', percentage);
                    progressBar.textContent = percentage.toFixed(1) + '%';
                    
                    // Set color based on percentage
                    if (percentage > 80) {
                        progressBar.className = 'progress-bar bg-success';
                    } else if (percentage > 50) {
                        progressBar.className = 'progress-bar bg-primary';
                    } else {
                        progressBar.className = 'progress-bar bg-warning';
                    }
                }, 300 + (index * 100)); // Stagger the animations
            });
        } else {
            dailyProgressContainer.innerHTML = '<p class="text-center">No progress data available for the past 7 days</p>';
        }
    }
});