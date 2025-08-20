// --- DOM Element References ---
const lookupForm = document.getElementById('lookup-form');
const wordInput = document.getElementById('dictionary-word');
const languageSelector = document.getElementById('language-selector');
const submitButton = document.getElementById('dictionary-submit');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');
const wordDisplay = document.getElementById('word-display');
const theWordElement = document.getElementById('the-word');
const statusMessage = document.getElementById('status-message');
const imagesContainer = document.getElementById('images-container');
const theImagesElement = document.getElementById('the-images');
const grossnessWarning = document.getElementById('grossness-warning');
const revealGrossnessButton = document.getElementById('reveal-grossness-button');
const definitionContent = document.getElementById('the-definition-content');
const actionButtons = document.getElementById('action-buttons');
const gotoTranslationsBtn = document.getElementById('goto-translations-btn');
const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('q');

if (searchQuery) {
    wordInput.value = searchQuery;
    //submitButton.click();
}


// --- Language Data ---
const languageData = {
    en: { name: 'English', mainSections: ['Proper noun', 'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition', 'Conjunction', 'Interjection'] },
    fr: { name: 'Français', mainSections: ['Nom commun', 'Verbe', 'Adjectif', 'Adverbe', 'Nom propre', 'Forme de verbe'] },
    es: { name: 'Español', mainSections: ['Sustantivo', 'Verbo', 'Adjetivo', 'Adverbio', 'Nombre propio'] },
    pt: { name: 'Português', mainSections: ['Substantivo', 'Verbo', 'Adjetivo', 'Advérbio', 'Nome próprio'] },
    de: { name: 'Deutsch', mainSections: ['Substantiv', 'Verb', 'Adjektiv', 'Adverb', 'Eigenname'] },
    ja: { name: '日本語', mainSections: ['名詞', '動詞', '形容詞', '副詞'] },
    ru: { name: 'Русский', mainSections: ['Существительное', 'Глагол', 'Прилагательное', 'Наречие'] },
    zh: { name: '中文', mainSections: ['名词', '动词', '形容词', '副词'] }
};

// --- Content Filters ---
const naughtyRegex = /(vagina|condom|circumcised|ejaculation|ejaculate|erection|pubic|cum|pubes|bollock|vulva|clit|sex|penis|phallus|genital|ballsack|testicle|butt|ass|breast|boob|nipple|dildo|labia|masturbation|masturbate|semen|smegma)/i;
const grossRegex = /(pus|blood|poop|excrement|urine|piss|shit)/i;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', loadLang);
languageSelector.addEventListener('change', setLang);
lookupForm.addEventListener('submit', handleFormSubmit);

revealGrossnessButton.addEventListener('click', () => {
    theImagesElement.classList.remove('blurred');
    grossnessWarning.style.display = 'none';
});

definitionContent.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-lookup="true"]');
    if (!link) return;
    e.preventDefault();
    try {
        const url = new URL(link.getAttribute('href'));
        let word = url.pathname.split('/').pop();
        if (word) {
            word = word.split('#')[0];
            wordInput.value = decodeURIComponent(word);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            lookupForm.requestSubmit();
        }
    } catch (error) {
        console.error("Could not parse link:", error);
    }
});

gotoTranslationsBtn.addEventListener('click', () => {
    const translationsSection = definitionContent.querySelector('[id^="Translations"]');
    if (translationsSection) {
        translationsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// --- Main Functions ---
function loadLang() {
    chrome.storage.local.get(['selectedLanguage'], function(result) {
        if (result.selectedLanguage) {
            languageSelector.value = result.selectedLanguage;
        }
    });
}

function setLang() {
    chrome.storage.local.set({selectedLanguage: languageSelector.value});
}

async function handleFormSubmit(e=null) {

    if (e)
    e.preventDefault();

    const word = wordInput.value.trim();
    const lang = languageSelector.value;
    if (!word) return;

    resetUI();
    setLoadingState(true);

    try {
        if (naughtyRegex.test(word)) {
            throw new Error('This content has been determined to be inappropriate to display. Please search for another word.');
        }
        const [wiktionaryData, imageData] = await Promise.all([
            fetchWiktionaryData(word, lang),
            fetchImageData(word, lang)
        ]);

        renderResults(word, wiktionaryData, imageData);
    } catch (error) {
        renderError(error.message, word);
    } finally {
        setLoadingState(false);
    }
}

async function fetchWiktionaryData(word, lang) {
    const url = `https://${lang}.wiktionary.org/w/api.php?action=parse&origin=*&format=json&page=${encodeURIComponent(word)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    const json = await response.json();

    if (json.error) {
        throw new Error(`The word "${word}" was not found in ${languageData[lang].name}.`);
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(json.parse.text['*'], "text/html");
    
    const langName = languageData[lang].name;
    const langHeaderSpan = doc.getElementById(langName);

    let contentSource = doc.body;
    if (langHeaderSpan) {
        const contentFragment = document.createDocumentFragment();
        let element = langHeaderSpan.parentElement; // This is the H2
        
        while (element) {
            // The section ends at a horizontal rule or the next H2 that is NOT the one we started with.
            if (element.tagName === 'HR' || (element.tagName === 'H2' && element !== langHeaderSpan.parentElement)) {
                break;
            }
            contentFragment.appendChild(element.cloneNode(true));
            element = element.nextElementSibling;
        }
        contentSource = contentFragment;
    }
    
    return cleanHtml(contentSource, lang);
}

async function fetchImageData(word, lang) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=images&imlimit=8&redirects=1&titles=${encodeURIComponent(word)}&uselang=${lang}`;
    const response = await fetch(url);
    const json = await response.json();
    const images = [];
    if (!json.query || !json.query.pages) return [];
    const page = Object.values(json.query.pages)[0];
    if (!page.images) return [];
    for (const image of page.images) {
        const title = image.title;
        const ext = title.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                images.push(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(title)}`);
        }
    }
    return images;
}

// --- UI Rendering and Helper Functions ---

function renderResults(word, definitionHtml, imageUrls) {
    wordDisplay.classList.remove('hidden');
    wordDisplay.classList.add('fade-in');
    theWordElement.textContent = word;

    if (definitionHtml && definitionHtml.childNodes.length > 0) {
        definitionContent.replaceChildren(definitionHtml);
        definitionContent.classList.remove('hidden');

        // Show/hide the translations button based on content
        const translationsSection = definitionContent.querySelector('[id^="Translations"]');
        if (translationsSection) {
            gotoTranslationsBtn.classList.remove('hidden');
        } else {
            gotoTranslationsBtn.classList.add('hidden');
        }

    } else {
        const lang = languageSelector.value;
        renderError(`No definition found for "${word}" in the ${languageData[lang].name} section.`);
    }

    if (imageUrls.length > 0) {
        theImagesElement.innerHTML = imageUrls.map(url => `<div class="aspect-w-1 aspect-h-1"><img src="${url}" alt="Image related to ${word}" class="w-full h-full object-cover rounded-lg shadow-md" loading="lazy"></div>`).join('');
        imagesContainer.classList.remove('hidden');
        if (grossRegex.test(word)) {
            theImagesElement.classList.add('blurred');
            grossnessWarning.style.display = 'block';
        } else {
            theImagesElement.classList.remove('blurred');
            grossnessWarning.style.display = 'none';
        }
    }
}

function renderError(message, word) {
    let html = `<p>${message}</p>`;
    if (word && /[A-Z]/.test(word) && message.includes("not found")) {
        const lowerCaseWord = word.toLowerCase();
        html += `<p class="mt-2">This dictionary is case-sensitive. Try looking up <a href="#" id="retry-word" class="font-bold underline">${lowerCaseWord}</a> instead.</p>`;
    }
    statusMessage.innerHTML = html;
    statusMessage.classList.remove('hidden');
    const retryLink = document.getElementById('retry-word');
    if (retryLink) {
        retryLink.addEventListener('click', (e) => {
            e.preventDefault();
            wordInput.value = retryLink.textContent;
            lookupForm.requestSubmit();
        });
    }
}

function cleanHtml(fragment, lang) {
    fragment.querySelectorAll('.mw-editsection, .interproject-box, .noprint, style, .thumb, .gallery, figure, img').forEach(el => el.remove());
    fragment.querySelectorAll('.NavFrame').forEach(navFrame => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        const head = navFrame.querySelector('.NavHead');
        if (head) {
            summary.append(...head.childNodes);
            details.appendChild(summary);
        }
        const content = navFrame.querySelector('.NavContent');
        if (content) details.append(...content.childNodes);
        navFrame.replaceWith(details);
    });
    
    const newNodes = [];
    const children = [...fragment.childNodes];
    let i = 0;
    while (i < children.length) {
        const node = children[i];
        const isHeading = node.nodeType === 1 && ['H2', 'H3', 'H4', 'H5'].includes(node.tagName);
        let shouldCollapse = false;
        if (isHeading) {
            const headingText = node.textContent.replace(/\[edit\]/g, '').trim();
            const isMainSection = languageData[lang].mainSections.some(section => headingText.toLowerCase().startsWith(section.toLowerCase()));
            if (!isMainSection) shouldCollapse = true;
        }

        if (shouldCollapse) {
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.appendChild(node);
            details.appendChild(summary);
            let nextIndex = i + 1;
            while (nextIndex < children.length) {
                const nextNode = children[nextIndex];
                if (nextNode.nodeType === 1 && ['H2', 'H3', 'H4', 'H5'].includes(nextNode.tagName)) break;
                details.appendChild(nextNode);
                nextIndex++;
            }
            newNodes.push(details);
            i = nextIndex;
        } else {
            newNodes.push(node);
            i++;
        }
    }

    const newFragment = document.createDocumentFragment();
    newFragment.append(...newNodes);

    newFragment.querySelectorAll('a').forEach(a => {
        let href = a.getAttribute('href');
        if (!href) return;
        const wiktionaryUrl = `https://${lang}.wiktionary.org`;
        if (href.startsWith('/wiki/')) href = `${wiktionaryUrl}${href}`;
        else if (href.startsWith('/w/')) href = `${wiktionaryUrl}${href}`;
        a.href = href;
        if (href.includes('wiktionary.org/wiki/')) a.dataset.lookup = 'true';
        else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    });
    
    return newFragment;
}

function setLoadingState(isLoading) {
    submitButton.disabled = isLoading;
    buttonText.classList.toggle('hidden', isLoading);
    buttonSpinner.classList.toggle('hidden', !isLoading);
}

function resetUI() {
    wordDisplay.classList.add('hidden');
    statusMessage.classList.add('hidden');
    imagesContainer.classList.add('hidden');
    definitionContent.classList.add('hidden');
    definitionContent.innerHTML = '';
    gotoTranslationsBtn.classList.add('hidden');
    grossnessWarning.style.display = 'none';
    theImagesElement.classList.remove('blurred');
}