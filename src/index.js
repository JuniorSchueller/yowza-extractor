const SendLog = {
    Engine: () => {
        console.log('===== YOWZA EXTRACT =====');
    },

    MatchFinished: (count) => {
        console.log(`Matching with params finished:\n\n- Equal: ${count.equal}\n- Different: ${count.different}\n- Contains: ${count.contains}\n- StartsWith: ${count.startswith}\n- EndsWith: ${count.endswith}\n`);
    },

    RefineFinished: (count) => {
        console.log(`Refining matches with params finished:\n\n- Equal: ${count.equal}\n- Different: ${count.different}\n- Contains: ${count.contains}\n- StartsWith: ${count.startswith}\n- EndsWith: ${count.endswith}\n`);
    },

    MatchingEmpty: () => {
        console.log('Matching returned nothing.');
    },

    MatchingOnlyOne: () => {
        console.log('Matching returned only one result, ignoring refinery.');
    },

    RefineryGreaterThanOne: () => {
        console.log('Refinery returned more than 1 result, using the first by default.');
    },

    DirectLineSetNotFound: () => {
        console.log('The line set via "dangerously-set-line" was not found in the content. Try using valid search params instead.');
    }
};

function GetLineContent(content, line = 1) {
    try {
        const lines = content.split(/\r?\n/);
        return lines[line - 1] ?? null;
    } catch {
        return null;
    }
}

const Extractor = {
    extract: (content, params = {}) => {
        const silent = !!(params && params.silent);
        const noop = () => {};
        const log = silent ? {
            Engine: noop,
            MatchFinished: noop,
            RefineFinished: noop,
            MatchingEmpty: noop,
            MatchingOnlyOne: noop,
            RefineryGreaterThanOne: noop,
            DirectLineSetNotFound: noop
        } : SendLog;

        log.Engine();

        if (!content || typeof content !== 'string' || typeof params !== 'object' || params === null) {
            throw new TypeError('Invalid file param type');
        }

        content = content.replace(/\r\n/g, '\n');

        const find = params.find || {};

        const KnownParams = {
            Find: {
                Equals: find.equals || null,
                Different: find.different || null,
                Contains: find.contains || null,
                StartsWith: find.startswith || null,
                EndsWith: find.endswith || null,
                MultiLine: find.multiline ? {
                    StartBefore: find.multiline['start-before'] || null,
                    StartAfter: find.multiline['start-after'] || null,
                    EndBefore: find.multiline['end-before'] || null,
                    EndAfter: find.multiline['end-after'] || null
                } : null,
                Line: find['dangerously-set-line'] || null,
                SplitBy: find['split-by'] || null,
                HandleMultilineSplitBy: !!find['handle-multiline-split-by']
            },
            IsJson: params.isJsonOutput ?? true
        };

        const toOutput = (value) => (KnownParams.IsJson ? JSON.parse(value) : value);
        const getLineText = (line) => {
            if (!KnownParams.Find.SplitBy) return line;
            const index = line.indexOf(KnownParams.Find.SplitBy);
            return index !== -1 ? line.substring(index + KnownParams.Find.SplitBy.length) : line;
        };

        if (KnownParams.Find.Line) {
            const line = GetLineContent(content, parseInt(KnownParams.Find.Line, 10));

            if (!line) {
                log.DirectLineSetNotFound();
                log.Engine();
                return null;
            }

            const lineText = getLineText(line);
            log.Engine();

            return toOutput(lineText);
        }

        if (KnownParams.Find.MultiLine) {
            const { StartBefore, StartAfter, EndBefore, EndAfter } = KnownParams.Find.MultiLine;

            if (StartBefore && StartAfter) throw new Error('MultiLine can\'t use both start params.');
            if (EndBefore && EndAfter) throw new Error('MultiLine can\'t use both end params.');
            if (!StartBefore && !StartAfter) throw new Error('MultiLine start param is required.');
            if (!EndBefore && !EndAfter) throw new Error('MultiLine end param is required.');
            if (KnownParams.Find.HandleMultilineSplitBy && !KnownParams.Find.SplitBy) throw new Error('handle-multiline-split-by requires split-by to be set.');

            let tmp = content;

            if (StartBefore) {
                const index = tmp.indexOf(StartBefore);
                if (index === -1) {
                    log.Engine();
                    return null;
                }
                tmp = tmp.substring(index);
            } else {
                const index = tmp.indexOf(StartAfter);
                if (index === -1) {
                    log.Engine();
                    return null;
                }
                tmp = tmp.substring(index + StartAfter.length);
            }

            if (EndBefore) {
                const index = tmp.lastIndexOf(EndBefore);
                if (index === -1) {
                    log.Engine();
                    return null;
                }
                tmp = tmp.substring(0, index);
            } else {
                const index = tmp.lastIndexOf(EndAfter);
                if (index === -1) {
                    log.Engine();
                    return null;
                }
                tmp = tmp.substring(0, index + EndAfter.length);
            }

            log.Engine();

            if (tmp.length === 0) return null;

            if (KnownParams.Find.HandleMultilineSplitBy) {
                const splitLines = tmp.split(/\r?\n/).filter((l) => l.length > 0).map(getLineText);
                return toOutput(splitLines);
            }

            return toOutput(tmp);
        }

        const hasFindCriteria = KnownParams.Find.Equals || KnownParams.Find.Different || KnownParams.Find.Contains || KnownParams.Find.StartsWith || KnownParams.Find.EndsWith;

        if (!hasFindCriteria) {
            throw new Error('No "find" param provided for the content.');
        }

        const matchingLines = [];
        const refinedLines = [];
        const count = {
            match: { equal: 0, different: 0, contains: 0, startswith: 0, endswith: 0 },
            refine: { equal: 0, different: 0, contains: 0, startswith: 0, endswith: 0 }
        };

        content.split(/\r?\n/).forEach((line) => {
            const lineText = getLineText(line);

            if (KnownParams.Find.Equals && lineText === KnownParams.Find.Equals) {
                count.match.equal += 1;
                matchingLines.push(lineText);
            } else if (KnownParams.Find.Different && lineText !== KnownParams.Find.Different) {
                count.match.different += 1;
                matchingLines.push(lineText);
            } else if (KnownParams.Find.Contains && lineText.includes(KnownParams.Find.Contains)) {
                count.match.contains += 1;
                matchingLines.push(lineText);
            } else if (KnownParams.Find.StartsWith && lineText.startsWith(KnownParams.Find.StartsWith)) {
                count.match.startswith += 1;
                matchingLines.push(lineText);
            } else if (KnownParams.Find.EndsWith && lineText.endsWith(KnownParams.Find.EndsWith)) {
                count.match.endswith += 1;
                matchingLines.push(lineText);
            }
        });

        log.MatchFinished(count.match);

        if (matchingLines.length === 0) {
            log.MatchingEmpty();
            log.Engine();
            return null;
        }

        if (matchingLines.length === 1) {
            log.MatchingOnlyOne();
            log.Engine();
            return toOutput(matchingLines[0]);
        }

        matchingLines.forEach((matchingLine) => {
            let passesAll = true;

            if (KnownParams.Find.Equals !== null) {
                if (matchingLine === KnownParams.Find.Equals) count.refine.equal += 1;
                else passesAll = false;
            }

            if (KnownParams.Find.Different !== null) {
                if (matchingLine !== KnownParams.Find.Different) count.refine.different += 1;
                else passesAll = false;
            }

            if (KnownParams.Find.Contains !== null) {
                if (matchingLine.includes(KnownParams.Find.Contains)) count.refine.contains += 1;
                else passesAll = false;
            }

            if (KnownParams.Find.StartsWith !== null) {
                if (matchingLine.startsWith(KnownParams.Find.StartsWith)) count.refine.startswith += 1;
                else passesAll = false;
            }

            if (KnownParams.Find.EndsWith !== null) {
                if (matchingLine.endsWith(KnownParams.Find.EndsWith)) count.refine.endswith += 1;
                else passesAll = false;
            }

            if (passesAll) refinedLines.push(matchingLine);
        });

        log.RefineFinished(count.refine);

        if (refinedLines.length > 1) {
            log.RefineryGreaterThanOne();
        }

        log.Engine();

        return refinedLines.length > 0 ? toOutput(refinedLines[0]) : toOutput(matchingLines[0]);
    }
};

module.exports = Extractor;
