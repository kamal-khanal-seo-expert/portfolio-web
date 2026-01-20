document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const keywordInput = document.getElementById('keywordInput');
    const runBtn = document.getElementById('runClusterBtn');
    const resultsArea = document.getElementById('resultsArea');
    const clusterOutput = document.getElementById('clusterOutput');
    const loadingBar = document.getElementById('loadingBar');
    const groupCountSpan = document.getElementById('groupCount');
    const exportBtn = document.getElementById('exportBtn');
    const csvUpload = document.getElementById('csvUpload');
    const fileStats = document.getElementById('fileStats');

    // --- State ---
    let rawKeywords = [];
    let clusters = {};

    // --- EXPERT INTENT CLASSIFICATION (Based on your Research) ---
    const INTENTS = {
        // 1. Transactional: Ready to buy/act
        transactional: [
            'buy', 'purchase', 'order', 'shop', 'reserve', 'schedule', 'book', 'hire', 
            'download', 'install', 'subscribe', 'join', 
            'coupon', 'discount', 'promo', 'deal', 'sale', 'offer', 'price', 'pricing', 
            'cost', 'quote', 'fee', 'rates'
        ],
        
        // 2. Commercial Investigation: Researching before buying
        commercial: [
            'best', 'top', 'top-rated', 'cheap', 'affordable', 'budget', 
            'vs', 'versus', 'compare', 'comparison', 'alternative', 'review', 'reviews', 
            'recommendation', 'recommended', 'test', 'software', 'tool', 'platform', 
            'firm', 'agency', 'company', 'provider', 'service', 'specialist', 'consultant' 
            // "Agency/Service" often implies looking for a provider to compare (Commercial)
        ],

        // 3. Navigational: Looking for specific site/page
        navigational: [
            'login', 'signin', 'sign up', 'register', 'portal', 'dashboard', 
            'contact', 'support', 'help', 'status', 
            'website', 'site', 'official', 'homepage', 'www', '.com', '.np'
        ],

        // 4. Informational: Seeking knowledge (Default)
        informational: [
            'what', 'how', 'why', 'who', 'where', 'when', 
            'guide', 'tutorial', 'tips', 'trick', 'hack', 'strategy', 'strategies', 
            'definition', 'meaning', 'example', 'sample', 'template', 'checklist', 
            'benefits', 'pros', 'cons', 'history', 'learn', 'course', 'training', 
            'audit', 'optimization', 'analysis', 'stats', 'statistics'
        ]
    };

    // --- Event Listeners ---
    runBtn.addEventListener('click', startClustering);
    exportBtn.addEventListener('click', () => exportToCSV(clusters));
    
    csvUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const lines = e.target.result.split(/\r\n|\n/).filter(line => line.trim() !== '');
            keywordInput.value = lines.join('\n');
            fileStats.textContent = `${lines.length} keywords loaded`;
            fileStats.style.color = 'var(--secondary)';
        };
        reader.readAsText(file);
    });

    // --- Main Workflow ---
    function startClustering() {
        const text = keywordInput.value.trim();
        if (!text) { alert("Please enter keywords!"); return; }

        // UI Reset
        resultsArea.style.display = 'block';
        loadingBar.style.display = 'block';
        clusterOutput.innerHTML = '';
        runBtn.disabled = true;
        runBtn.innerHTML = 'Analyzing <span class="spinner-small"></span>';

        // Process with Delay
        setTimeout(() => {
            rawKeywords = text.split(/\r\n|\n/).filter(k => k.trim().length > 0);
            const strictness = document.getElementById('clusterLevel').value;
            clusters = runProfessionalAlgorithm(rawKeywords, strictness);
            renderClusters(clusters);
            loadingBar.style.display = 'none';
            runBtn.disabled = false;
            runBtn.textContent = '🚀 Cluster Keywords';
        }, 800);
    }

    // --- Expert Algorithm ---
    function runProfessionalAlgorithm(keywords, strictness) {
        // 1. Pre-process: Clean, Stem, and Tag Intent
        let processed = keywords.map(k => {
            return {
                original: k,
                cleanTokens: tokenizeAndStem(k), 
                intentData: detectIntent(k) 
            };
        });

        // Sort by shortest length (Short queries = Parent Topics)
        processed.sort((a, b) => a.cleanTokens.length - b.cleanTokens.length);

        const groups = {};
        const assigned = new Set();
        const minOverlap = strictness === 'high' ? 0.75 : (strictness === 'medium' ? 0.5 : 0.35);

        // 2. Clustering Logic
        processed.forEach(parent => {
            if (assigned.has(parent.original)) return;

            const groupName = parent.original; 
            groups[groupName] = [];
            
            // Add parent FIRST
            groups[groupName].push(parent);
            assigned.add(parent.original);

            // Find children
            processed.forEach(child => {
                if (assigned.has(child.original)) return;

                const similarity = calculateSimilarity(parent.cleanTokens, child.cleanTokens);
                const isContained = parent.cleanTokens.every(t => child.cleanTokens.includes(t));

                if (similarity >= minOverlap || isContained) {
                    groups[groupName].push(child);
                    assigned.add(child.original);
                }
            });
        });

        return groups;
    }

    // --- Helper: Jaccard Similarity ---
    function calculateSimilarity(arr1, arr2) {
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    // --- Helper: Smart Tokenizer ---
    function tokenizeAndStem(str) {
        const stopWords = ['the', 'and', 'for', 'in', 'of', 'to', 'a', 'is', 'on', 'with']; 
        return str.toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .split(/\s+/)
            .filter(w => !stopWords.includes(w) && w.length > 2)
            .map(w => simpleStemmer(w));
    }

    function simpleStemmer(word) {
        if (word.endsWith('ing')) return word.slice(0, -3);
        if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
        if (word.endsWith('ed')) return word.slice(0, -2);
        if (word.endsWith('ly')) return word.slice(0, -2);
        return word;
    }

    // --- Expert Intent Detector ---
    function detectIntent(str) {
        const s = str.toLowerCase();
        
        // Priority 1: Navigational (Specific Site - Rare but specific)
        for (const word of INTENTS.navigational) if (s.includes(word)) return { label: 'Navigational', code: 'N', color: '#3b82f6' }; // Blue
        
        // Priority 2: Transactional (Ready to Buy)
        for (const word of INTENTS.transactional) if (s.includes(word)) return { label: 'Transactional', code: 'T', color: '#10b981' }; // Green
        
        // Priority 3: Commercial (Researching)
        for (const word of INTENTS.commercial) if (s.includes(word)) return { label: 'Commercial', code: 'C', color: '#f59e0b' }; // Orange

        // Priority 4: Informational (Explicit Questions)
        for (const word of INTENTS.informational) if (s.includes(word)) return { label: 'Informational', code: 'I', color: '#8b5cf6' }; // Purple
        
        // Default Fallback
        return { label: 'Informational', code: 'I', color: '#8b5cf6' };
    }

    // --- UI Rendering ---
    function renderClusters(groups) {
        const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
        groupCountSpan.textContent = sortedKeys.length;

        sortedKeys.forEach(headTerm => {
            const list = groups[headTerm];
            
            // Find dominant intent
            const intents = list.map(i => i.intentData.label);
            const dominantIntent = intents.sort((a,b) => intents.filter(v => v===a).length - intents.filter(v => v===b).length).pop();
            const intentObj = list.find(i => i.intentData.label === dominantIntent).intentData;

            const card = document.createElement('div');
            card.className = 'cluster-card';
            card.innerHTML = `
                <div class="cluster-head">
                    <div>
                        <span class="cluster-title">${toTitleCase(headTerm)}</span>
                        <span class="cluster-badge" style="background:${intentObj.color}20; color:${intentObj.color}">${dominantIntent}</span>
                    </div>
                    <span class="count-badge">${list.length}</span>
                </div>
                <div class="cluster-body">
                    ${list.map(item => `
                        <div class="keyword-row">
                            <span>${item.original}</span>
                            <span class="intent-tiny" style="color:${item.intentData.color}; font-weight:700" title="${item.intentData.label}">${item.intentData.code}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            clusterOutput.appendChild(card);
        });
    }

    // --- Pro Export Function (Structured for Excel) ---
    function exportToCSV(groups) {
        let csvContent = "data:text/csv;charset=utf-8,Cluster Name,Keyword,Intent Code,Intent Type,Count\n";
        
        // Sort clusters by size
        const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

        sortedKeys.forEach(head => {
            const list = groups[head];
            list.forEach(item => {
                // Sanitize
                const cleanHead = head.replace(/"/g, '""');
                const cleanKw = item.original.replace(/"/g, '""');
                csvContent += `"${cleanHead}","${cleanKw}","${item.intentData.code}","${item.intentData.label}",${list.length}\n`;
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SEO_Clusters_Expert_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
});