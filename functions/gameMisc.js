require('dotenv').config();

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
module.exports = {
    alphabet: alphabet,
    //generowanie planszy
    generateBoards: (height, width) =>
    {
        const board = new Array();

        for (let i = 0; i < height; i++)
        {
            board.push({ });
            for (let j = 0; j < width; j++)
                board[i][alphabet[j]] = 0;
        }

        return board;
    },
    //sparwdzanie czy pionek może się tam ruszyć, gdzie chce przeciwnik()
    checkPawnMove: (width, heigth, pawn, pos) =>
    {
        if(pawn.x < 0 || pawn.x > width - 1 || pawn.y < 0 || pawn.y > heigth - 1)
            return false;
        if(pos.x < 0 || pos.x > width - 1 || pos.y < 0 || pos.y > heigth - 1)
            return false;

        return true;
    },
    //poruszanie się pionkiem, zmiana miejsca w tablicy
    movePawn: (board, pawn, pos) =>
    {
        board[pos.y][alphabet[pos.x]] = board[pawn.y][alphabet[pawn.x]];
        board[pawn.y][alphabet[pawn.x]] = 0;
    }
}