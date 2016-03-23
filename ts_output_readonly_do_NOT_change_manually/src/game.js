;
var game;
(function (game) {
    // I export all letiables to make it easy to debug in the browser by
    // simply typing in the console:
    // game.state
    game.animationEnded = false;
    game.canMakeMove = false;
    game.isComputerTurn = false;
    game.move = null;
    game.state = null;
    game.isHelpModalShown = false;
    game.moves = new Array();
    game.msg = "";
    function init() {
        translate.setTranslations(getTranslations());
        translate.setLanguage('en');
        log.log("Translation of 'RULES_OF_ENCLOSECOMBAT' is " + translate('RULES_OF_ENCLOSECOMBAT'));
        resizeGameAreaService.setWidthToHeight(1);
        moveService.setGame({
            minNumberOfPlayers: 2,
            maxNumberOfPlayers: 2,
            checkMoveOk: gameLogic.checkMoveOkNoOp,
            updateUI: updateUI
        });
        // See http://www.sitepoint.com/css3-animation-javascript-event-handlers/
        document.addEventListener("animationend", animationEndedCallback, false); // standard
        document.addEventListener("webkitAnimationEnd", animationEndedCallback, false); // WebKit
        document.addEventListener("oanimationend", animationEndedCallback, false); // Opera
        setTimeout(animationEndedCallback, 1000); // Just in case animationEnded is not fired by some browser.
        var w = window;
        if (w["HTMLInspector"]) {
            setInterval(function () {
                w["HTMLInspector"].inspect({
                    excludeRules: ["unused-classes", "script-placement"],
                });
            }, 3000);
        }
    }
    game.init = init;
    function getTranslations() {
        return {
            RULES_OF_ENCLOSECOMBAT: {
                en: "Rules of EncloseCombat",
                cn: "画圈大战的规则",
            },
            RULES_SLIDE1: {
                en: "You and your opponent take turns to draw an enclosed circle over the chips of same color.",
                cn: "你和你的对手轮流操作，在相同颜色的卡片上围成一个闭合的形状。然后这个形状上和其内的卡片会消失，上面的会掉下来，新的卡片也会补充进来。",
            },
            RULES_SLIDE2: {
                en: "The more chips you include in that circle, the higher score you get.",
                cn: "形状越大分数越高，十个回合之后分数高的人获胜。",
            },
            CLOSE: {
                en: "Close",
                cn: "关闭",
            },
        };
    }
    function animationEndedCallback() {
        log.info("Hi");
        $rootScope.$apply(function () {
            log.info("Animation ended");
            game.animationEnded = true;
            sendComputerMove();
        });
    }
    function sendComputerMove() {
        if (!game.isComputerTurn) {
            return;
        }
        game.isComputerTurn = false; // to make sure the computer can only move once.
        log.info("computer");
        moveService.makeMove(aiService.findSimplyComputerMove(game.move));
    }
    function updateUI(params) {
        log.info("Game got updateUI:", params);
        game.animationEnded = false;
        game.move = params.move;
        game.state = game.move.stateAfterMove;
        if (!game.state) {
            game.state = gameLogic.getInitialState();
        }
        game.canMakeMove = game.move.turnIndexAfterMove >= 0 &&
            params.yourPlayerIndex === game.move.turnIndexAfterMove; // it's my turn
        // Is it the computer's turn?
        game.isComputerTurn = game.canMakeMove &&
            params.playersInfo[params.yourPlayerIndex].playerId === '';
        if (game.isComputerTurn) {
            // To make sure the player won't click something and send a move instead of the computer sending a move.
            game.canMakeMove = false;
            // We calculate the AI move only after the animation finishes,
            // because if we call aiService now
            // then the animation will be paused until the javascript finishes.
            if (!game.state.delta) {
                // This is the first move in the match, so
                // there is not going to be an animation, so
                // call sendComputerMove() now (can happen in ?onlyAIs mode)
                sendComputerMove();
            }
        }
    }
    function cellPressedDown(row, col) {
        game.moves.push({ row: row, col: col });
    }
    game.cellPressedDown = cellPressedDown;
    function cellEnter(row, col) {
        if (game.moves.length !== 0 && !(game.moves.length === 1 && game.moves[0] === { row: row, col: col })) {
            game.moves.push({ row: row, col: col });
        }
    }
    game.cellEnter = cellEnter;
    function cellPressedUp() {
        log.info("Slided on cell:", angular.toJson(game.moves));
        if (window.location.search === '?throwException') {
            throw new Error("Throwing the error because URL has '?throwException'");
        }
        if (!game.canMakeMove) {
            return;
        }
        try {
            var nextMove = gameLogic.createMove(game.state, game.moves, game.move.turnIndexAfterMove);
            game.canMakeMove = false; // to prevent making another move
            moveService.makeMove(nextMove);
            game.moves = new Array();
        }
        catch (e) {
            log.info(e);
            game.moves = new Array();
            return;
        }
    }
    game.cellPressedUp = cellPressedUp;
    function shouldShowImage(row, col) {
        return true;
    }
    game.shouldShowImage = shouldShowImage;
    function isPieceR(row, col) {
        return game.state.board[row][col] === 'R';
    }
    game.isPieceR = isPieceR;
    function isPieceG(row, col) {
        return game.state.board[row][col] === 'G';
    }
    game.isPieceG = isPieceG;
    function isPieceB(row, col) {
        return game.state.board[row][col] === 'B';
    }
    game.isPieceB = isPieceB;
    function shouldSlowlyAppear(row, col) {
        var b = false;
        if (game.state.delta !== null) {
            for (var i = 0; i < game.state.delta.length; i++) {
                if (game.state.delta[i].row >= row && game.state.delta[i].col === col) {
                    b = true;
                }
            }
        }
        return !game.animationEnded &&
            game.state.delta && b;
    }
    game.shouldSlowlyAppear = shouldSlowlyAppear;
    function clickedOnModal(evt) {
        if (evt.target === evt.currentTarget) {
            evt.preventDefault();
            evt.stopPropagation();
            game.isHelpModalShown = false;
        }
        return true;
    }
    game.clickedOnModal = clickedOnModal;
})(game || (game = {}));
angular.module('myApp', ['ngTouch', 'ui.bootstrap', 'gameServices'])
    .run(function () {
    'use strict';
    var gameArea = document.getElementById("gameArea");
    var draggingLines = document.getElementById("draggingLines");
    var pline = document.getElementById("pline");
    var pline2 = document.getElementById("pline2");
    var nextZIndex = 61;
    dragAndDropService.addDragListener("gameArea", handleDragEvent);
    var rowsNum = gameLogic.ROWS;
    var colsNum = gameLogic.COLS;
    var draggingPiece = null;
    var draggingStartedRowCol = null; // The {row: YY, col: XX} where dragging started.
    function handleDragEvent(type, clientX, clientY) {
        // Center point in gameArea
        var x = clientX - gameArea.offsetLeft;
        var y = clientY - gameArea.offsetTop;
        var row, col;
        // Is outside gameArea?
        if (x < 0 || y < 0 || x >= gameArea.clientWidth || y >= gameArea.clientHeight) {
            if (draggingPiece) {
            }
            else {
                draggingLines.style.display = "none";
                return;
            }
        }
        else {
            // Inside gameArea. Let's find the containing square's row and col
            col = Math.floor(colsNum * x / gameArea.clientWidth);
            row = Math.floor(rowsNum * y / gameArea.clientHeight);
            var cy = gameArea.clientHeight / 2 / rowsNum * (row * 2 + 1);
            var cx = gameArea.clientWidth / 2 / colsNum * (col * 2 + 1);
            var percent = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (gameArea.clientHeight / 2 / rowsNum);
            if (game.moves.length !== 0) {
                var XY = getSquareCenterXY(game.moves[game.moves.length - 1].row, game.moves[game.moves.length - 1].col);
                pline2.setAttribute("x1", XY.x + "");
                pline2.setAttribute("y1", XY.y + "");
                pline2.setAttribute("x2", x + "");
                pline2.setAttribute("y2", y + "");
            }
            if (percent > 0.5) {
                if (type === "touchend" || type === "touchcancel" || type === "touchleave") {
                    game.moves = new Array();
                    pline.setAttribute("points", "");
                    draggingLines.style.display = "none";
                }
                return;
            }
            if (type === "touchstart" && !draggingStartedRowCol) {
                // drag started
                draggingStartedRowCol = { row: row, col: col };
                draggingPiece = document.getElementById("e2e_test_div_" + draggingStartedRowCol.row + "x" + draggingStartedRowCol.col);
            }
            if (!draggingPiece) {
                return;
            }
            if (type === "touchend") {
                if (!(game.moves[game.moves.length - 1].row === row && game.moves[game.moves.length - 1].col === col)) {
                    var tt_1 = game.isPieceR(row, col) ? document.getElementById("e2e_test_pieceR_" + row + "x" + col) : game.isPieceG(row, col) ? document.getElementById("e2e_test_pieceG_" + row + "x" + col) : document.getElementById("e2e_test_pieceB_" + row + "x" + col);
                    tt_1.setAttribute("r", "55%");
                    setTimeout(function () { tt_1.setAttribute("r", "40%"); }, 100);
                    draggingPiece = document.getElementById("e2e_test_div_" + row + "x" + col);
                    game.moves.push({ row: row, col: col });
                }
                log.info(angular.toJson(game.moves));
                dragDone();
            }
            else {
                // Drag continue
                if ((game.moves.length == 0) || !(game.moves[game.moves.length - 1].row === row && game.moves[game.moves.length - 1].col === col)) {
                    var tt_2 = game.isPieceR(row, col) ? document.getElementById("e2e_test_pieceR_" + row + "x" + col) : game.isPieceG(row, col) ? document.getElementById("e2e_test_pieceG_" + row + "x" + col) : document.getElementById("e2e_test_pieceB_" + row + "x" + col);
                    tt_2.setAttribute("r", "45%");
                    setTimeout(function () { tt_2.setAttribute("r", "40%"); }, 100);
                    draggingPiece = document.getElementById("e2e_test_div_" + row + "x" + col);
                    game.moves.push({ row: row, col: col });
                    draggingLines.style.display = "inline";
                    if (type === "touchstart") {
                        pline2.setAttribute("x1", "0");
                        pline2.setAttribute("y1", "0");
                        pline2.setAttribute("x2", "0");
                        pline2.setAttribute("y2", "0");
                    }
                    var centerXY = getSquareCenterXY(row, col);
                    if (game.moves.length == 1) {
                        pline.setAttribute("points", centerXY.x + "," + centerXY.y + " ");
                    }
                    else {
                        var tmp = pline.getAttribute("points");
                        pline.setAttribute("points", tmp + centerXY.x + "," + centerXY.y + " ");
                    }
                }
            }
        }
        if (type === "touchend" || type === "touchcancel" || type === "touchleave") {
            // drag ended
            // return the piece to it's original style (then angular will take care to hide it).
            draggingStartedRowCol = null;
            draggingPiece = null;
            draggingLines.style.display = "none";
            game.moves = new Array();
        }
    }
    function setDraggingPieceTopLeft(topLeft) {
        var originalSize = getSquareTopLeft(draggingStartedRowCol.row, draggingStartedRowCol.col);
        draggingPiece.style.left = (topLeft.left - originalSize.left) + "px";
        draggingPiece.style.top = (topLeft.top - originalSize.top) + "px";
    }
    function getSquareWidthHeight() {
        return {
            width: gameArea.clientWidth / colsNum,
            height: gameArea.clientHeight / rowsNum
        };
    }
    function getSquareTopLeft(row, col) {
        var size = getSquareWidthHeight();
        return { top: row * size.height, left: col * size.width };
    }
    function getSquareCenterXY(row, col) {
        var size = getSquareWidthHeight();
        return {
            x: col * size.width + size.width / 2,
            y: row * size.height + size.height / 2
        };
    }
    function dragDone() {
        $rootScope.$apply(function () {
            // Update piece in board
            game.cellPressedUp();
        });
    }
    $rootScope['game'] = game;
    game.init();
    resizeGameAreaService.setWidthToHeight(0.75);
});
//# sourceMappingURL=game.js.map