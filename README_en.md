🌍 *Read this in other languages: **English**, [한국어](README.md)*

# English Games

This project is a web service that provides English-related mini-games. Users can select a game from the main lobby. Currently, **Wordle** is implemented, and more games are planned for future updates. For the development roadmap, please refer to the documents in the [Wiki Pages](https://github.com/1st-world/English-Games/wiki).

## Wordle Overview

**Wordle** is a game where players try to guess a word of a specific length within 6 attempts. Each guess is evaluated with color-coded feedback based on letter position and accuracy. At the end of the round, the correct answer and its dictionary definition are provided, adding an educational element.

### Rules

- Guess the randomly selected English word within 6 attempts.

- The accuracy of your guess is indicated by colors for each letter:
  - **Green**: Both the letter and position are correct.
  - **Yellow**: The letter is in the word but in the wrong position.
  - **Gray**: The letter is not in the word.

  ![Sample Image](./sample_play_result.png)

### Data Sources & APIs

- **Valid Word List**: `words_alpha_sorted.txt`
  - Used to verify if the player's input is a valid word.
  - Also used to validate words passed via shared Challenge links.

- **Answer Candidates and Difficulty Data**: `word_frequencies.json`
  - The answer word is selected from this local data when a game starts.
  - Difficulty is determined based on how frequently each word is used in real life.
  - If there are no suitable candidates for the selected difficulty, a random word is chosen from the full available pool.

- **Word Definition Lookup**: [Free Dictionary API](https://dictionaryapi.dev/)
  - Used to provide the meaning of the correct answer after the game ends.
  - The game remains playable even if this feature fails due to network issues or API unresponsiveness.

- **Sources of Local Word Data**
  - `words_alpha_sorted.txt` is based on data from the [dwyl / English-words](https://github.com/dwyl/english-words) repository.
  - `word_frequencies.json` was generated from `words_alpha_sorted.txt` using `zipf_frequency` from the `wordfreq` package.

## How to Run

This project can be run directly in a web browser via a local server or GitHub Pages.

- [**Play directly on GitHub Pages**](https://1st-world.github.io/English-Games/)

- **Run Locally**
  1. Clone or download this repository.
  2. Make sure all files in the project directory are present.
  3. Due to browser security policies (CORS), you must run it through a local web server rather than simply opening the HTML files.
      - For example, you can use the 'Live Server' extension in VS Code.
      - Or, if Python is installed: `python -m http.server 8000`

## License & Credits

The third-party license information provided here is only a convenience summary. For accurate and legally binding terms, please check the original license documents and official sources directly.

- The source code of this project is generally distributed under the [MIT License](LICENSE).

- To prevent falling back to system default fonts when external CDNs are blocked by browser features such as strict tracking protection, the font files are included directly within the project and loaded locally. The font license is separate from the code license, and its terms must be followed accordingly.
  - **Applied fonts: [NanumSquareNeo](https://campaign.naver.com/nanumsquare_neo)**
  - According to the documentation, the fonts are licensed under SIL OFL 1.1.
  - The intellectual property rights of the fonts belong to NAVER Corporation. These fonts are provided free of charge to all users, including individuals and businesses, and may be used commercially except for selling the font files themselves.

- Third-party assets for icon support are included in the project.
  - **Applied assets: [Font Awesome Free](https://fontawesome.com)**
  - According to the documentation, the icons are licensed under CC BY 4.0, the web fonts under SIL OFL 1.1, and the code under the MIT License.
