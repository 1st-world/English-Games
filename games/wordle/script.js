import { DialogManager, showToast } from '../../js/common.js';

let WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let secretWord = '';
let secretWordDefinition = '';
let currentGuess = '';
let guesses = [];
let isGameEnd = true;
let validWordsSet = new Set();
let wordFrequencies = {};
let currentDifficulty = 'normal';

const STATE_CORRECT = 'state-correct';
const STATE_PRESENT = 'state-present';
const STATE_ABSENT = 'state-absent';

const UI = {
    helpBtn: document.getElementById('help-btn'),
    how2playDialog: document.getElementById('how2play-dialog'),
    wordGrid: document.getElementById('word-grid'),
    newGameBtn: document.getElementById('new-game-btn'),
    resultDialog: document.getElementById('result-dialog'),
    resultTitle: document.getElementById('result-title'),
    resultMsg: document.getElementById('result-msg'),
    resultWord: document.getElementById('result-word'),
    resultDefinition: document.getElementById('result-definition'),
    shareChallengeBtn: document.getElementById('share-challenge-btn'),
    modalNewGameBtn: document.getElementById('modal-new-game-btn')
}

UI.helpBtn.addEventListener('click', (event) => {
    event.preventDefault();
    DialogManager.open(UI.how2playDialog);
});

UI.how2playDialog.addEventListener('dialog-closed', () => {
    UI.wordGrid.focus();
});

UI.shareChallengeBtn.addEventListener('click', async () => {
    const link = generateChallengeLink();
    const shareData = {
        title: 'Wordle 도전장',
        text: '제가 풀어낸 Wordle 문제입니다. 도전해 보시겠어요?',
        url: link
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error(`Web Share API Error: ${error}`);
        }
    }
    if (!navigator.clipboard) {
        showToast('현재 환경에서는 클립보드에 접근할 수 없습니다.', 2000);
        return;
    }
    try {
        const link = generateChallengeLink();
        await navigator.clipboard.writeText(link);
        showToast('링크를 클립보드에 복사했습니다!', 2000);
    } catch (error) {
        console.error(`System Error in shareChallengeBtn.addEventListener: ${error}`);
        showToast('링크 복사에 실패했습니다.', 2000);
    }
});

UI.modalNewGameBtn.addEventListener('click', () => {
    DialogManager.close(UI.resultDialog);
    initializeGame();
});

async function loadLocalWords() {
    try {
        const [validResponse, answerResponse] = await Promise.all([
            fetch('words_alpha_sorted.txt'),
            fetch('word_frequencies.json')
        ]);
        if (!validResponse.ok) throw new Error('Local valid words list load failed.');
        if (!answerResponse.ok) throw new Error('Local answer words list load failed.');

        const validText = await validResponse.text();
        const validWords = validText.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => /^[A-Z]+$/.test(w));
        validWordsSet = new Set(validWords);
        wordFrequencies = await answerResponse.json();
        console.log(`Local words list loaded: ${validWordsSet.size} total valid words.`);
        return true;
    } catch (error) {
        console.error(`System Error in loadLocalWords(): ${error}`);
        return false;
    }
}

function getRandomWord() {
    const currentPool = wordFrequencies[WORD_LENGTH] || {};
    let targetPool = [];
    const difficultyCheck = {
        easy: (freq) => freq >= 4.0,
        normal: (freq) => freq >= 3.0 && freq < 5.0,
        hard: (freq) => freq < 3.0
    };
    for (const [word, freq] of Object.entries(currentPool)) {
        if (difficultyCheck[currentDifficulty](freq)) {
            targetPool.push(word);
        }
    }
    if (targetPool.length === 0) {
        targetPool = Object.keys(currentPool);
        if (targetPool.length === 0) {
            throw new Error(`No words available for ${WORD_LENGTH}-letter mode.`);
        }
        console.warn(`No word correspond to [Difficulty: ${currentDifficulty}], so a random word is selected from all words.`);
    }
    const randomIndex = Math.floor(Math.random() * targetPool.length);
    return targetPool[randomIndex].toUpperCase();
}

async function getDefinition(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();
        if (response.ok) {
            if (data[0]?.meanings[0]?.definitions[0]?.definition) {
                return data[0].meanings[0].definitions[0].definition;
            } else {
                throw new Error('Malformed data structure.');
            }
        } else {
            if (data.title === "No Definitions Found") {
                if (word.endsWith('s')) {
                    // If the word ends with 's', remove it and search again
                    return await getDefinition(word.slice(0, -1));
                }
                else {
                    return null;
                }
            } else {
                throw new Error(`API server error: ${response.status}.`);
            }
        }
    } catch (error) {
        console.error(`System Error in getDefinition(): ${error}`);
        throw error;
    }
}

async function initializeGame() {
    UI.newGameBtn.disabled = true;
    UI.newGameBtn.textContent = '새 게임';
    UI.newGameBtn.onclick = initializeGame;
    showToast('로드 중…');

    if (validWordsSet.size === 0 || Object.keys(wordFrequencies).length === 0) {
        const success = await loadLocalWords();
        if (!success) {
            alert('단어 데이터를 불러오는 데 실패했습니다. 관리자에게 문의 바랍니다.');
            showToast('오류가 발생했습니다.');
            UI.newGameBtn.disabled = false;
            return;
        }
    }

    const challengeInfo = getChallengeWord();
    let challengeWord = challengeInfo.word;
    let attempts = 0;
    while (true) {
        attempts++;
        if (attempts > 1) {
            showToast(`로드 중… (${attempts})`);
        }
        try {
            secretWord = (challengeWord && attempts === 1) ? challengeWord : getRandomWord();
        } catch (error) {
            console.error(`System Error in getRandomWord(): ${error}`);
            showToast('현재 글자 수 설정에 맞는 단어 데이터가 없습니다.');
            UI.newGameBtn.disabled = false;
            return;
        }
        if (!validWordsSet.has(secretWord)) continue;
        try {
            const def = await getDefinition(secretWord.toLowerCase());
            if (def) {
                secretWordDefinition = def;
                break; 
            }
        } catch (error) {
            console.warn(`Dictionary API call failed: ${error}. Starting without definition.`);
            secretWordDefinition = "⚠️ The definition could not be loaded due to connection issues.";
            break;
        }
    }
    initializeGrid();
    currentGuess = '';
    guesses = [];
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove(STATE_CORRECT, STATE_PRESENT, STATE_ABSENT);
    })
    showToast('');
    if (challengeInfo.error) {
        showToast('유효하지 않은 도전장입니다. 무작위 단어로 시작합니다.', 2000);
    }
    UI.wordGrid.focus();
    UI.newGameBtn.disabled = false;
    isGameEnd = false;
}

function initializeGrid() {
    UI.wordGrid.style.setProperty('--word-length', WORD_LENGTH);
    UI.wordGrid.style.setProperty('--max-guesses', MAX_GUESSES);

    const isEmpty = (UI.wordGrid.children.length === 0) || (guesses.length === 0 && currentGuess === '');
    if (isEmpty) {
        UI.wordGrid.innerHTML = '';
        for (let i = 0; i < MAX_GUESSES; i++) {
            for (let j = 0; j < WORD_LENGTH; j++) {
                const letterBox = document.createElement('div');
                letterBox.className = 'letter-box intro-pop';
                letterBox.addEventListener('animationend', () => {
                    letterBox.classList.remove('intro-pop');
                }, { once: true });
                UI.wordGrid.appendChild(letterBox);
            }
        }
    } else {
        const letterBoxes = UI.wordGrid.children;
        for (let i = 0; i < letterBoxes.length; i++) {
            const letterBox = letterBoxes[i];
            letterBox.classList.remove('pop', 'intro-pop');
            void letterBox.offsetWidth;     // Force a reflow by accessing an offset property
            const delay = i * 20;
            setTimeout(() => {
                letterBox.classList.add('reset-flip');
            }, delay);
            setTimeout(() => {
                letterBox.textContent = '';
                letterBox.removeAttribute('data-status');
                letterBox.className = 'letter-box reset-flip';
            }, delay + 250);    // delay + (animation: reset-filp 0.5s / 2)
            letterBox.addEventListener('animationend', () => {
                letterBox.classList.remove('reset-flip');
            }, { once: true });
        }
    }
}

function updateGrid() {
    const letterBoxes = UI.wordGrid.children;
    const keyboardState = {};

    for (let i = 0; i < MAX_GUESSES; i++) {
        for (let j = 0; j < WORD_LENGTH; j++) {
            const letterBox = letterBoxes[i * WORD_LENGTH + j];
            const oldText = letterBox.textContent;
            letterBox.classList.remove(STATE_CORRECT, STATE_PRESENT, STATE_ABSENT);

            if (i < guesses.length) {
                const letter = guesses[i][j];
                const stateClass = getStates(guesses[i])[j];
                updateKeyboardState(keyboardState, letter, stateClass);
                letterBox.textContent = letter;
                letterBox.classList.add(stateClass);
                letterBox.classList.remove('pop');
                letterBox.removeAttribute('data-status');
            } else if (i === guesses.length && j < currentGuess.length) {
                const letter = currentGuess[j];
                letterBox.textContent = letter;
                letterBox.setAttribute('data-status', 'filled');
                if (oldText !== letter) {
                    letterBox.classList.remove('pop');  // Remove the class in case it's still present
                    void letterBox.offsetWidth;         // Force a reflow by accessing an offset property
                    letterBox.classList.add('pop');
                    letterBox.addEventListener('animationend', () => {
                        letterBox.classList.remove('pop');
                    }, { once: true });
                }
            } else {
                letterBox.textContent = '';
                letterBox.removeAttribute('data-status');
                letterBox.classList.remove('pop');
            }
        }
    }
    applyKeyboardState(keyboardState);
}

function getStates(guess) {
    const states = Array(WORD_LENGTH).fill(STATE_ABSENT);
    const secretLetterCount = {};

    for (let i = 0; i < WORD_LENGTH; i++) {
        secretLetterCount[secretWord[i]] = (secretLetterCount[secretWord[i]] || 0) + 1;
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === secretWord[i]) {
            states[i] = STATE_CORRECT;
            secretLetterCount[guess[i]]--;
        }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (states[i] !== STATE_CORRECT && secretLetterCount[guess[i]] > 0) {
            states[i] = STATE_PRESENT;
            secretLetterCount[guess[i]]--;
        }
    }
    return states;
}

function updateKeyboardState(state, letter, stateClass) {
    const priority = {
        [STATE_CORRECT]: 3,
        [STATE_PRESENT]: 2,
        [STATE_ABSENT]: 1
    };
    if (!state[letter] || priority[stateClass] > priority[state[letter]]) {
        state[letter] = stateClass;
    }
}

function applyKeyboardState(state) {
    for (const [letter, stateClass] of Object.entries(state)) {
        const key = document.querySelector(`.key[data-key="${letter.toLowerCase()}"]`);
        if (key) {
            key.classList.remove(STATE_CORRECT, STATE_PRESENT, STATE_ABSENT);
            key.classList.add(stateClass);
        }
    }
}

async function handleGameEnd(isWin) {
    isGameEnd = true;

    if (isWin) {
        UI.resultTitle.textContent = '🎉 축하합니다!';
        UI.resultMsg.textContent = `${guesses.length}번 만에 정답을 맞혔습니다!`;
    } else {
        UI.resultTitle.textContent = '💥 아쉽네요!';
        UI.resultMsg.textContent = '다음 기회에 다시 도전해 보세요.';
    }
    UI.resultWord.textContent = secretWord;
    UI.resultDefinition.innerHTML = `<a href="https://en.wiktionary.org/wiki/${secretWord.toLowerCase()}" target="_blank" rel="noopener noreferrer" title="자세히 보기">${secretWordDefinition} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;

    setTimeout(() => {
        DialogManager.open(UI.resultDialog);
    }, 1000);

    UI.newGameBtn.textContent = '결과 보기';
    UI.newGameBtn.onclick = () => {
        DialogManager.open(UI.resultDialog);
    };
}

function handleKeyDown(event) {
    let key = event.key || (event.keyCode !== undefined ? String.fromCharCode(event.keyCode) : '');
    const gameFocusAllowList = [UI.wordGrid, document.body, null];
    const isGamePlayable = gameFocusAllowList.includes(document.activeElement);

    if (!isGamePlayable || guesses.length >= MAX_GUESSES || isGameEnd) return;

    if (key === 'Enter' || key === 'Space' || key === ' ') {
        event.preventDefault();
        showToast('');
        if (currentGuess.length !== WORD_LENGTH) {
            showToast(`단어는 ${WORD_LENGTH}글자여야 합니다.`, 1500);
            shakeRow();
            return;
        }
        if (validWordsSet.size > 0 && !validWordsSet.has(currentGuess)) {
            showToast('단어 목록에 없는 단어입니다.', 1500);
            shakeRow();
            return;
        }
        guesses.push(currentGuess);
        if (currentGuess === secretWord) {
            handleGameEnd(true);
        } else if (guesses.length === MAX_GUESSES) {
            handleGameEnd(false);
        }
        currentGuess = '';
    } else if (key === 'Backspace') {
        currentGuess = currentGuess.slice(0, -1);
        showToast('');
    } else if (/^[A-Za-z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        currentGuess += key.toUpperCase();
        showToast('');
    }
    updateGrid();
}

function shakeRow() {
    const start_idx = guesses.length * WORD_LENGTH;
    const end_idx = start_idx + WORD_LENGTH;
    const letterBoxes = UI.wordGrid.children;

    for (let i = start_idx; i < end_idx; i++) {
        const letterBox = letterBoxes[i];
        letterBox.classList.remove('shake');    // Remove the class in case it's still present
        void letterBox.offsetWidth;             // Force a reflow by accessing an offset property
        letterBox.classList.add('shake');
        letterBox.addEventListener('animationend', () => {
            letterBox.classList.remove('shake');
        }, { once: true });
    }
}

function generateChallengeLink() {
    const encodedWord = btoa(secretWord.toLowerCase());
    const url = new URL(window.location.href);
    url.searchParams.set('challenge', encodedWord);
    return url.toString();
}

function getChallengeWord() {
    const params = new URLSearchParams(window.location.search);
    const challenge = params.get('challenge');
    if (!challenge) return { word: null, error: null };

    try {
        const decodedWord = atob(challenge).toUpperCase();
        if (decodedWord.length === WORD_LENGTH && validWordsSet.has(decodedWord)) {
            return { word: decodedWord, error: null };
        } else {
            throw new Error('Invalid challenge word.');
        }
    } catch (error) {
        console.error(`System Error in getChallengeWord(): ${error}`);
        return { word: null, error: error };
    } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

document.querySelectorAll('.key').forEach(button => {
    button.addEventListener('mousedown', (event) => {
        event.preventDefault();
    });

    button.addEventListener('click', (event) => {
        const key = event.currentTarget.getAttribute('data-key');
        const keyboardEvent = new KeyboardEvent('keydown', {key: key});
        handleKeyDown(keyboardEvent);
    });
});

document.addEventListener('keydown', handleKeyDown);

initializeGame();
