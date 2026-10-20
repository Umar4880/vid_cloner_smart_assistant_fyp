/**
 * Video Summarizer Module
 * ChatGPT-style UI with Manual/YouTube dropdown
 */
(function () {
    'use strict';

    // ── DOM cache ────────────────────────────────────────────────
    const el = {
        noteList:           document.getElementById('noteList'),
        mobileNoteList:     document.getElementById('mobileNoteList'),
        notesContainer:     document.getElementById('notesContainer'),
        initialPlaceholder: document.getElementById('initialPlaceholder'),
        waitingPlaceholder: document.getElementById('waitingPlaceholder'),
        waitingSubtext:     document.getElementById('waitingSubtext'),
        videoUploader:      document.getElementById('videoUploader'),
        uploadLabel:        document.getElementById('uploadLabel'),
        slideInMenu:        document.getElementById('slideInMenu'),
        mobileMenuButton:   document.getElementById('mobileMenuButton'),
        menuOverlay:        document.getElementById('menuOverlay'),
        // Input bar elements
        sourceLabel:   document.getElementById('sourceLabel'),
        uploadZone:    document.getElementById('uploadZone'),
        youtubeZone:   document.getElementById('youtubeZone'),
        youtubeUrl:    document.getElementById('youtubeUrl'),
        generateBtn:   document.getElementById('generateBtn'),
        inputBar:      document.getElementById('inputBar'),
        // Update panel
        updatePanel:   document.getElementById('updatePanel'),
        updateInstr:   document.getElementById('updateInstructions'),
        updateImage:   document.getElementById('updateImage'),
        imageFileName: document.getElementById('imageFileName'),
        updateBtn:     document.getElementById('updateBtn'),
    };

    // Track current source type
    let currentSource = 'upload';  // 'upload' or 'youtube'

    // Track currently displayed note (for updates)
    let currentNoteId   = null;
    let currentRawNotes = '';

    // ── Helpers ──────────────────────────────────────────────────
    function getCookie(name) {
        if (!document.cookie) return null;
        const c = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
        return c ? decodeURIComponent(c.trim().substring(name.length + 1)) : null;
    }

    function showMessage(msg, isErr = false) { 
        alert(isErr ? `Error: ${msg}` : msg); 
    }

    async function handleFetchResponse(resp) {
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        return resp.json();
    }

    // ── Source dropdown toggle ───────────────────────────────────
    const sourceIcon = document.getElementById('sourceIcon');
    const sourceDropdown = document.getElementById('sourceDropdown');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    // Manual dropdown toggle (fallback if Bootstrap JS fails)
    if (sourceDropdown && dropdownMenu) {
        sourceDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle d-none class (since manually removing d-none works)
            const isHidden = dropdownMenu.classList.contains('d-none');
            if (isHidden) {
                dropdownMenu.classList.remove('d-none');
                sourceDropdown.setAttribute('aria-expanded', 'true');
            } else {
                dropdownMenu.classList.add('d-none');
                sourceDropdown.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!sourceDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.add('d-none');
                sourceDropdown.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Use event delegation on the dropdown menu
    document.addEventListener('click', function(e) {
        // Handle dropdown option clicks
        if (e.target.closest('.source-option')) {
            const option = e.target.closest('.source-option');
            
            // Update active state
            document.querySelectorAll('.source-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            
            // Get source type
            currentSource = option.dataset.source;
            
            // Update label and icon
            if (el.sourceLabel) {
                el.sourceLabel.textContent = currentSource === 'upload' ? 'Manual' : 'YouTube';
            }
            if (sourceIcon) {
                sourceIcon.className = currentSource === 'upload' ? 'bi bi-upload' : 'bi bi-youtube';
            }
            
            // Toggle zones
            if (el.uploadZone && el.youtubeZone) {
                el.uploadZone.classList.toggle('d-none', currentSource !== 'upload');
                el.youtubeZone.classList.toggle('d-none', currentSource !== 'youtube');
            }
            
            // Close dropdown after selection
            if (dropdownMenu) {
                dropdownMenu.classList.add('d-none');
                if (sourceDropdown) sourceDropdown.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Show chosen filename in the upload label
    if (el.videoUploader) {
        el.videoUploader.addEventListener('change', () => {
            if (el.videoUploader.files.length && el.uploadLabel) {
                el.uploadLabel.textContent = el.videoUploader.files[0].name;
            }
        });
    }

    // Show attached image name in the update panel
    if (el.updateImage) {
        el.updateImage.addEventListener('change', () => {
            if (el.imageFileName) {
                el.imageFileName.textContent = el.updateImage.files.length
                    ? el.updateImage.files[0].name : '';
            }
        });
    }

    // ── Slide-in menu (mobile sidebar) ───────────────────────────
    function toggleSlideMenu() {
        if (!el.slideInMenu) return;
        el.slideInMenu.classList.toggle('open');
        if (el.menuOverlay)
            el.menuOverlay.style.display = el.slideInMenu.classList.contains('open') ? 'block' : 'none';
    }

    // ── Notes list (sidebar) ─────────────────────────────────────
    function createNoteItem(title, isMobile = false) {
        const li = document.createElement('li');
        li.className = 'note-item';

        const span = document.createElement('span');
        span.textContent = title.title;
        span.onclick = () => { loadSummary(title.id); if (isMobile) toggleSlideMenu(); };

        const menu = document.createElement('button');
        menu.className = 'summ-menu-button';
        menu.innerHTML = '<i class="bi bi-three-dots-vertical"></i>';
        menu.onclick = e => { e.stopPropagation(); toggleNoteMenu(e, title.id, span); };

        li.append(span, menu);
        return li;
    }

    function updateNoteList(container, titles, isMobile = false) {
        if (!container) return;
        container.innerHTML = '';
        if (!titles.length) {
            container.innerHTML = '<li class="note-item">No saved notes yet</li>';
            return;
        }
        const frag = document.createDocumentFragment();
        titles.forEach(t => frag.appendChild(createNoteItem(t, isMobile)));
        container.appendChild(frag);
    }

    async function loadTitles() {
        try {
            const titles = await handleFetchResponse(await fetch('/get-titles/'));
            updateNoteList(el.noteList, titles);
            updateNoteList(el.mobileNoteList, titles, true);
        } catch (e) {
            console.error('loadTitles', e);
        }
    }

    // ── Note context menu (rename / delete / download) ───────────
    function toggleNoteMenu(event, noteId, titleSpan) {
        document.querySelectorAll('.summ-dropdown-menu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'summ-dropdown-menu';
        menu.style.position = 'absolute';
        menu.style.top  = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        menu.innerHTML = `
            <button class="summ-dropdown-option">Rename</button>
            <button class="summ-dropdown-option">Delete</button>
            <button class="summ-dropdown-option">Download</button>`;
        document.body.appendChild(menu);
        const opts = menu.querySelectorAll('.summ-dropdown-option');
        opts[0].onclick = () => { renameNoteInline(noteId, titleSpan); menu.remove(); };
        opts[1].onclick = () => { deleteNote(noteId); menu.remove(); };
        opts[2].onclick = () => { downloadNotes(noteId); menu.remove(); };
        document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.remove(); }, { once: true });
        event.stopPropagation();
    }

    // ── Rename ───────────────────────────────────────────────────
    function renameNoteInline(noteId, elem) {
        if (elem.querySelector('input')) return;
        const cur = elem.textContent;
        const input = document.createElement('input');
        input.type = 'text'; input.value = cur; input.defaultValue = cur;
        input.className = 'rename-input'; input.style.width = '100%';
        elem.textContent = ''; elem.appendChild(input); input.focus();

        const save = () => {
            const v = input.value.trim();
            if (!v) { elem.textContent = input.defaultValue; return; }
            fetch(`/rename-note/${noteId}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                body: JSON.stringify({ title: v }),
            })
            .then(handleFetchResponse)
            .then(d => { elem.textContent = d.success ? v : input.defaultValue; })
            .catch(() => { elem.textContent = input.defaultValue; });
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    }

    // ── Delete ───────────────────────────────────────────────────
    function deleteNote(noteId) {
        if (!confirm('Delete this note?')) return;
        fetch(`/delete-note/${noteId}/`, { method: 'DELETE', headers: { 'X-CSRFToken': getCookie('csrftoken') } })
            .then(handleFetchResponse)
            .then(d => { if (d.success) { showMessage('Deleted!'); loadTitles(); } else showMessage(d.message, true); })
            .catch(e => { console.error(e); showMessage('Delete failed.', true); });
    }

    // ── Download (markdown) ──────────────────────────────────────
    function downloadNotes(noteId) {
        fetch(`/get-summary/${noteId}/`).then(handleFetchResponse).then(s => {
            if (s.error) { showMessage(s.error, true); return; }
            const blob = new Blob([s.notes], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${(s.title || 'notes').replace(/[/\\?%*:|"<>]/g, '-')}.md`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 100);
        }).catch(e => { console.error(e); showMessage('Download failed.', true); });
    }

    // ── Download PDF ─────────────────────────────────────────────
    function downloadPDF(noteContent, title) {
        try {
            if (typeof html2pdf === 'undefined') { showMessage('html2pdf not loaded.', true); return; }
            const safe = (title || 'notes').replace(/[/\\?%*:|"<>]/g, '-');
            const md = window.markdownit();
            const tmp = document.createElement('div');
            tmp.className = 'markdown-body';
            tmp.innerHTML = md.render(noteContent);
            document.body.appendChild(tmp);
            html2pdf().set({
                margin: [10,10,10,10],
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                filename: `${safe}.pdf`,
            }).from(tmp).save().then(() => document.body.removeChild(tmp));
        } catch (e) { console.error(e); showMessage(e.message, true); }
    }

    // ── Render notes ─────────────────────────────────────────────
    function renderNotes(notesText, title, noteId) {
        currentRawNotes = notesText;
        currentNoteId   = noteId || null;

        if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'none';
        if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';

        const md = window.markdownit();
        el.notesContainer.innerHTML = md.render(notesText);
        el.notesContainer.style.display = 'block';

        // Action bar (download + save)
        addActionBar(el.notesContainer, notesText, title);

        // Show update panel
        if (el.updatePanel) el.updatePanel.classList.remove('d-none');
    }

    function addActionBar(container, raw, title) {
        container.querySelectorAll('.notes-action-bar').forEach(b => b.remove());

        const bar = document.createElement('div');
        bar.className = 'notes-action-bar';

        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn btn-sm btn-outline-primary';
        dlBtn.innerHTML = '<i class="bi bi-download"></i> Download';
        dlBtn.onclick = () => {
            const blob = new Blob([raw], { type: 'text/markdown' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${(title || 'notes').replace(/[/\\?%*:|"<>]/g, '-')}.md`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };

        const pdfBtn = document.createElement('button');
        pdfBtn.className = 'btn btn-sm btn-outline-secondary';
        pdfBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> PDF';
        pdfBtn.onclick = () => downloadPDF(raw, title);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-sm btn-primary';
        saveBtn.innerHTML = '<i class="bi bi-save"></i> Save';
        saveBtn.onclick = () => saveNotesToDatabase(title || 'Untitled', raw);

        bar.append(dlBtn, pdfBtn, saveBtn);
        container.insertBefore(bar, container.firstChild);
    }

    // ── Save notes to database ───────────────────────────────────
    async function saveNotesToDatabase(title, notes) {
        try {
            const d = await handleFetchResponse(await fetch('/save-notes/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                body: JSON.stringify({ title, notes }),
            }));
            if (d.success) { showMessage('Saved!'); currentNoteId = d.note_id; loadTitles(); }
            else showMessage(d.message, true);
        } catch (e) { console.error(e); showMessage('Save failed.', true); }
    }

    // ── Load a saved summary ─────────────────────────────────────
    async function loadSummary(id) {
        try {
            const s = await handleFetchResponse(await fetch(`/get-summary/${id}/`));
            if (s.error) { showMessage(s.error, true); return; }
            renderNotes(s.notes, s.title, id);
        } catch (e) { console.error(e); showMessage('Could not load summary.', true); }
    }
    
    function showUploadProgress(percent, message) {
        const wrapper = document.getElementById('uploadWrapper');
        const fill = document.getElementById('uploadProgressFill');
        if (!wrapper || !fill) {
            console.warn('Progress bar elements not found:', { wrapper, fill });
            return;
        }
        wrapper.style.display = 'block';
        fill.style.width = percent + '%';
        fill.textContent = percent + '%';
        if (message) {
            // Update the waiting subtext if it exists
            const subtext = document.getElementById('waitingSubtext');
            if (subtext) subtext.textContent = message;
        }
    }

        // Upload helper using XHR so we can track upload progress
    function uploadFormDataWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            console.log('upload start')
            xhr.open('POST', '/stream-upload/', true);
            const csrftoken = getCookie('csrftoken');
            if (csrftoken) xhr.setRequestHeader('X-CSRFToken', csrftoken);

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    console.log('percent',percent)
                    showUploadProgress(percent, 'Uploading...');
                }
            });

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log('pass if condition')
                    try {
                        console.log('inside try before showig data')
                        const data = JSON.parse(xhr.responseText);
                        console.log('upload successfull')
                        resolve(data);
                    } catch (err) {
                        reject(new Error('Invalid JSON response from upload'));
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData)
        });
    }

    // ══════════════════════════════════════════════════════════════
    // ── GENERATE NOTES ───────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    if (el.generateBtn) {
        el.generateBtn.addEventListener('click', async () => {
            const fd = new FormData();
            fd.append('source_type', currentSource);
            fd.append('mode', 'fast');

            if (currentSource === 'upload') {
                if (!el.videoUploader || !el.videoUploader.files.length) { 
                    showMessage('Select a video first.', true); 
                    return; 
                }
                
                // --- STREAMING UPLOAD (much faster than old token approach) ---
                if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'flex';
                if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'none';
                
                try {
                    const file = el.videoUploader.files[0];
                    console.log("Uploading file:", file.name, "Size:", (file.size / 1024 / 1024).toFixed(2), "MB");
                    
                    // // Create FormData to send the file
                    const uploadFormData = new FormData();
                    uploadFormData.append('video', file);
                    
                    showUploadProgress(0, 'Starting upload...');
                    // Use XHR to get upload progress events
                    const uploadData = await uploadFormDataWithProgress(uploadFormData);
                    console.log("response from server", uploadData)
                    
                    if (uploadData.error) {
                        showMessage('Upload failed: ' + uploadData.error, true);
                        if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';
                        if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'flex';
                        return;
                    }
                    
                    console.log("SUCCESS! File uploaded to AssemblyAI.");
                    console.log("Upload URL:", uploadData.upload_url);
                    showUploadProgress(100, 'Generating your notes, wait a while!');
                    
                    // Append the URL to the FormData for generate-notes
                    fd.append('upload_url', uploadData.upload_url);
                } catch (uploadErr) {
                    showMessage('Upload failed: ' + uploadErr.message, true);
                    if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';
                    if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'flex';
                    return;
                }
                // --- END STREAMING UPLOAD ---

            } else {
                const url = el.youtubeUrl ? el.youtubeUrl.value.trim() : '';
                if (!url) { showMessage('Paste a YouTube URL first.', true); return; }
                fd.append('youtube_url', url);
                
                // Show waiting state for YouTube
                if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'flex';
                if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'none';
            }

            // Disable button during processing
            el.generateBtn.disabled = true;
            
            try {
                console.log("Sending to /generate-notes/...");
                const data = await handleFetchResponse(await fetch('/generate-notes/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    body: fd,
                }));
                
                if (data.error) {
                    showMessage(data.error, true);
                    if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';
                    if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'flex';
                } else {
                    // Render the notes
                    renderNotes(data.notes, extractTitle(data.notes), null);
                }
            } catch (err) {
                console.error('Generate notes error:', err);
                showMessage('Failed to generate notes: ' + err.message, true);
                if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';
                if (el.initialPlaceholder) el.initialPlaceholder.style.display = 'flex';
            } finally {
                el.generateBtn.disabled = false;
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    // ── UPDATE NOTES ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    if (el.updateBtn) {
        el.updateBtn.addEventListener('click', async () => {
            const instructions = el.updateInstr ? el.updateInstr.value.trim() : '';
            if (!instructions) { showMessage('Type your update instructions.', true); return; }
            if (!currentNoteId) { showMessage('Save the notes first before updating.', true); return; }

            const fd = new FormData();
            fd.append('note_id', currentNoteId);
            fd.append('source_type', currentSource);
            fd.append('mode', 'fast');
            fd.append('instructions', instructions);

            // Optionally re-attach source
            if (currentSource === 'upload' && el.videoUploader && el.videoUploader.files.length) {
                fd.append('video', el.videoUploader.files[0]);
            } else if (currentSource === 'youtube' && el.youtubeUrl) {
                fd.append('youtube_url', el.youtubeUrl.value.trim());
            }

            // Attach image if provided
            if (el.updateImage && el.updateImage.files.length) {
                fd.append('image', el.updateImage.files[0]);
            }

            el.updateBtn.disabled = true;
            if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'flex';
            if (el.waitingSubtext)     el.waitingSubtext.textContent = 'Updating your notes…';
            if (el.notesContainer)     el.notesContainer.style.display = 'none';

            try {
                const data = await handleFetchResponse(await fetch('/update-notes/', {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCookie('csrftoken') },
                    body: fd,
                }));

                if (data.error) {
                    showMessage(data.error, true);
                    if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';
                    if (el.notesContainer) el.notesContainer.style.display = 'block';
                } else {
                    renderNotes(data.notes, extractTitle(data.notes), currentNoteId);
                    if (el.updateInstr) el.updateInstr.value = '';
                    if (el.updateImage) el.updateImage.value = '';
                    if (el.imageFileName) el.imageFileName.textContent = '';
                }
            } catch (e) {
                console.error('update', e);
                showMessage('Update failed.', true);
            } finally {
                el.updateBtn.disabled = false;
                if (el.waitingPlaceholder) el.waitingPlaceholder.style.display = 'none';
            }
        });
    }

    // ── Utility ──────────────────────────────────────────────────
    function extractTitle(md) {
        const m = md.match(/^#\s+(.+)/m);
        return m ? m[1].trim() : 'Untitled Notes';
    }

    // ── Init ─────────────────────────────────────────────────────
    function init() {
        // Initialize dropdown state
        const activeOption = document.querySelector('.source-option.active');
        if (activeOption) {
            currentSource = activeOption.dataset.source;
            if (el.sourceLabel) {
                el.sourceLabel.textContent = currentSource === 'upload' ? 'Manual' : 'YouTube';
            }
            if (sourceIcon) {
                sourceIcon.className = currentSource === 'upload' ? 'bi bi-upload' : 'bi bi-youtube';
            }
            // Ensure zones are in correct state
            if (el.uploadZone && el.youtubeZone) {
                el.uploadZone.classList.toggle('d-none', currentSource !== 'upload');
                el.youtubeZone.classList.toggle('d-none', currentSource !== 'youtube');
            }
        }

        if (el.mobileMenuButton)
            el.mobileMenuButton.addEventListener('click', toggleSlideMenu);
        if (el.menuOverlay)
            el.menuOverlay.addEventListener('click', toggleSlideMenu);

        loadTitles()
            .then(() => {
                if (el.initialPlaceholder &&
                    el.notesContainer &&
                    !el.notesContainer.innerHTML.trim()) {
                    el.initialPlaceholder.style.display = 'flex';
                }
            })
            .catch(console.error);
    }

    // Expose globals needed by inline onclick attributes
    window.saveNotesToDatabase = saveNotesToDatabase;
    window.loadTitles    = loadTitles;
    window.loadSummary   = loadSummary;
    window.deleteNote    = deleteNote;
    window.toggleSlideMenu = toggleSlideMenu;
    window.downloadNotes = downloadNotes;
    window.downloadPDF   = downloadPDF;

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();