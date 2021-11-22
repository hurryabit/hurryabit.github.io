const BEFORE = 0;
const DURING = 1;
const AFTER = 2;

let GIST_CUTS = [];

window.addEventListener('DOMContentLoaded', () => {
    const gists = document.getElementsByClassName("gist");
    for (let index = 0; index < GIST_CUTS.length; ++index) {
        const start = GIST_CUTS[index];
        const gist = gists.item(index);
        const lines = Array.from(gist.getElementsByClassName("js-file-line"));

        let state = BEFORE;
        let end = undefined;
        for (const line of lines) {
            const text = line.textContent;
            switch (state) {
                case BEFORE:
                    if (start.test(text)) {
                        state = DURING;
                        let indent = 0;
                        while (indent < text.length && text.charAt(indent) == " ") {
                            indent += 1;
                        }
                        end = text.substring(0, indent) + "}";
                    } else {
                        line.parentElement.remove();
                    }
                    break;
                case DURING:
                    if (text == end) {
                        state = AFTER;
                    }
                    break;
                case AFTER:
                    if (start.test(text)) {
                        console.warn(`${start} matches a second time`);
                    }
                    line.parentElement.remove();
                    break;
            }
        }
    }
});
