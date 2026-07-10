/**
 * ai.js
 * Tic-tac-toe AI with minimax + alpha-beta pruning.
 *
 * The AI always plays as 'O' and the human as 'X' from the AI's perspective.
 * Difficulty is controlled by the search depth cap:
 *   easy   → random move
 *   medium → 60% best move (depth 3), 40% random
 *   hard   → full minimax (depth 9, effectively perfect play)
 */

/**
 * Choose the best available move index given the current board.
 * Called by game.js after determining it's the AI's turn.
 *
 * @param {string[]} cells  9-element array ('', 'X', 'O')
 * @param {string}   difficulty  'easy' | 'medium' | 'hard'
 * @returns {number} board index (0–8)
 */
 const AI_SETTINGS = {

  easy: {
      randomChance: 75,
      depth: 2,
      thinkTime: 900,
      block: false,
      center: false
  },

  medium: {
      randomChance: 30,
      depth: 5,
      thinkTime: 650,
      block: true,
      center: true
  },

  hard: {
      randomChance: 0,
      depth: 9,
      thinkTime: 350,
      block: true,
      center: true
  }

};

function getAiMove(cells, difficulty){

  const ai = AI_SETTINGS[difficulty] || AI_SETTINGS.hard;

  if(Math.random()*100 < ai.randomChance){
      return _randomMove(cells);
  }

  if(ai.block){

      // Win first
      for(let i=0;i<9;i++){

          if(cells[i]!=="") continue;

          let copy=[...cells];
          copy[i]="O";

          if(_checkWinner(copy)==="O")
              return i;
      }

      // Block player
      for(let i=0;i<9;i++){

          if(cells[i]!=="") continue;

          let copy=[...cells];
          copy[i]="X";

          if(_checkWinner(copy)==="X")
              return i;
      }

  }

  if(ai.center && cells[4]==="")
      return 4;

  return _bestMove(cells, ai.depth);

}

// ----- Internals -----

/** Pick a random empty cell — used directly for Easy and as fallback for Medium. */
function _randomMove(cells) {
  const empty = cells.reduce((acc, v, i) => (v === '' ? [...acc, i] : acc), []);
  return empty[Math.floor(Math.random() * empty.length)];
}

/**
 * Find the move that maximises the AI's (O's) score up to `maxDepth`.
 * Prefers the centre (index 4) when multiple moves score equally.
 */
function _bestMove(cells, maxDepth) {
  let bestScore = -Infinity;
  let bestIndex = 4; // centre bias for equally-scored moves

  for (let i = 0; i < 9; i++) {
    if (cells[i] !== '') continue;
    const copy = [...cells];
    copy[i] = 'O';
    const score = _minimax(copy, 'X', 'O', false, 1, -Infinity, Infinity, maxDepth);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Alpha-beta minimax.
 *
 * @param {string[]} cells
 * @param {string}   aiSymbol    the symbol we're maximising ('O')
 * @param {string}   humanSymbol the symbol we're minimising ('X')
 * @param {boolean}  isMaximising
 * @param {number}   depth
 * @param {number}   alpha
 * @param {number}   beta
 * @param {number}   maxDepth
 * @returns {number} heuristic score
 */
function _minimax(cells, aiSymbol, humanSymbol, isMaximising, depth, alpha, beta, maxDepth) {
  const winner = _checkWinner(cells);

  if (winner === aiSymbol) return 100 - depth;// AI wins sooner = better
  if (winner === humanSymbol) return depth - 100; // Human wins sooner = worse 
    
  if (cells.every(Boolean) || depth >= maxDepth) return 0;

  let best = isMaximising ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (cells[i] !== '') continue;
    const copy = [...cells];
    copy[i] = isMaximising ? aiSymbol : humanSymbol;

    const score = _minimax(copy, aiSymbol, humanSymbol, !isMaximising, depth + 1, alpha, beta, maxDepth);

    if (isMaximising) {
      best  = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }

    if (beta <= alpha) break; // prune
  }

  return best;
}

/**
 * Return the winning symbol on a board, or null if there's no winner yet.
 * Uses the global WIN_PATTERNS constant from constants.js.
 */
function _checkWinner(cells) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}
function getAiThinkTime(difficulty) {
    return (AI_SETTINGS[difficulty] || AI_SETTINGS.hard).thinkTime;
}


