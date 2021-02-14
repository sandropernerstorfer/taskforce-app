import validation from './scripts/validation.js';
const deskModal = document.querySelector('#addDeskModal');
const profileClose = document.querySelector('#profileClose');
const profileSave = document.querySelector('#profileSave');
const deskForm = document.querySelector('#createDeskForm');
const deskError = document.querySelector('#desknameError');
const userError = document.querySelector('#usernameError');
const cancelBox = document.querySelector('#cancel-box');
const editName = document.querySelector('#editName');
const nameField = document.querySelector('#currentUsername');

/**
 * BOARD DATA FETCH
 * 
 * -- beim öffnen des Dashboards werden vom server die benötigten USER und DESK daten gefetcht
 * -- in 'boardData' als object gespeichert
 * -- und im client entsprechen angezeigt
 */
let boardData = {};
fetch('/desk/userdata')
.then( response => response.json())
.then( data => {
    boardData = data;
    renderUserData();
    renderDeskData(); 
});

/**
 * DISPLAY DESK & USER DATA
 * 
 * lädt user und desk daten von dem boardData objekt in das Dokument
 * beide funktionen werden aufgerufen sobald: 
 * -- der server die daten geschickt hat
 * -- und einzeln wenn daten geupdated wurden
 */
function renderUserData(){
    const nameElements = document.querySelectorAll('.username');
    nameElements.forEach( element => {
        element.textContent = boardData.name;
    })
};
function renderDeskData(){
    console.log('desk-data');
};

//---- DESK CREATION
/**
 *  DESK-MODAL
 * 1.) nach dem öffnen -> Fokus auf Deskname Input
 * 2.) nach dem schließen -> Reset error und input
 */
deskModal.addEventListener('shown.bs.modal', () => {
    deskForm.deskname.focus();
});
deskModal.addEventListener('hidden.bs.modal', () => {
    deskError.innerHTML = '&nbsp;';
    deskForm.deskname.value = '';
});

/**
 * Desk Data Validation
 * Error Handling
 * Speicher Desk in Datenbank
 */ //#------------------ DATABASE WORK HERE
deskForm.addEventListener('submit', e => {
    e.preventDefault();
    const deskname = deskForm.deskname.value.trim();
    const error = validation.deskname(deskname);
    if(error !== ''){
        deskError.textContent = error;
        deskForm.deskname.focus();
    }
    else{
        const deskColors = ['green','blue','orange','black'];
        const allColors = document.querySelectorAll('.desk-color');
        const selectedColor = document.querySelector('.selected-color');
        const i = Array.prototype.indexOf.call(allColors, selectedColor);

        console.log(deskColors[i], deskname, boardData._id);
    }
});

/**
 * Desk FARBEN durchschalten
 * bei auswahl :
 * entferne alle .selected-color klassen
 * füge sie bei dem ausgewählten element hinzu
 */
document.addEventListener('click', e => {
    if(!e.target.matches('.desk-color')) return;
    const colorElements = document.querySelectorAll('.desk-color');
    colorElements.forEach( element => {
        element.classList.remove('selected-color');
    });
    e.target.classList.add('selected-color'); 
});

// ---- USER PROFILE
/**
 * newName; zwischenspeichert lokal den neu gewählten namen ( wenn validierung OK )
 * editing; boolean -> ändert den dataflow anhängig davon ob der name gerade bearbeitet wird oder nicht
 * editName Event Listener:
 * Übernimmt zwischenspeicherung, error handling und button + input wechsel
 */ //#--------------- ERROR HANDLING HERE
let newName;
let editing = false;
editName.addEventListener('click', e => {
    if(!editing){
        editing = true;
        nameField.innerHTML = `<input type="text" name="newUsername" maxlength="30" class="form-control shadow-none" id="newUsername" value=${nameField.textContent}>`;
        editName.innerHTML = `<i class="fas fa-check"></i>`;
        cancelBox.innerHTML = `<button class="btn btn-outline-success button shadow-none"><i id="cancel" class="fas fa-redo-alt"></i></button>`;
        document.querySelector('#newUsername').focus();
    }
    else{
        const inputValue = document.querySelector('#newUsername').value;
        const error = validation.name(inputValue);
        if(error == ''){
            newName = inputValue;
            editing = false;
            nameField.innerHTML = newName;
            editName.innerHTML = `<i class="fas fa-pencil-alt"></i>`;
            cancelBox.innerHTML = '';
            userError.textContent = '';
        }
        else{
            document.querySelector('#newUsername').focus();
            userError.textContent = error;
        }
    }
});

/**
 * Fängt Klick auf CANCEL EDIT button ab
 * und setzt den usernamen auf den letzten stand zurück
 */
document.addEventListener('click', e => {
    if(e.target.matches('#cancel')){
        editing = false;
        nameField.innerHTML = newName;
        editName.innerHTML = `<i class="fas fa-pencil-alt"></i>`;
        cancelBox.innerHTML = ''; 
        userError.textContent = '';
    }
    else return;
});

/**
 * PROFILE CLOSE EVENT LISTENER
 * 
 * wenn das modal geschlossen wird -> rufe resetProfile() funktion auf
 * resetProfile() setzt editing auf false , den zwischenspeicher auf den originalen username
 * und setzt die Profile Page auf standard zurück
 */
function resetProfile(){
    editing = false;
    newName = boardData.name;
    setTimeout(() => {
        nameField.innerHTML = boardData.name;
        editName.innerHTML = `<i class="fas fa-pencil-alt"></i>`;
        cancelBox.innerHTML = '';
        userError.textContent = ''; 
    }, 400);
};
profileClose.addEventListener('click', () => {
    resetProfile();
});

/**
 * PROFIL ÄNDERUNG SPEICHERN
 * 
 * wenn der SAVE button im Profil bereich geklickt wird
 * vergleiche den neuen namen mit dem originalen -> wenn identisch call close event (resetProfilpage)
 * wenn der name neu ist Update in der Datenbank und update client mit response
 */
profileSave.addEventListener('click', () => {
    if(newName === boardData.name || newName == undefined){
        profileClose.click();
    }
    else{
        fetch('/user/username', {
            method: 'PATCH',
            body: JSON.stringify({username : newName}),
            headers: {'Content-type' : 'application/json; charset=UTF-8'}
        })
        .then(response => response.json())
        .then( newName => {
            boardData.name = newName;
            profileClose.click();
            setTimeout(() => {
                renderUserData();    
            }, 400);
        });
    }
});

/**
 * USER LOGOUT
 * 
 * bei klick auf den Log Out button
 * server call auf /logout -> setzt lokal den user zurück und löscht session
 * danach redirect auf /login
 */
const userLogout = document.querySelector('#logoutButton');
userLogout.addEventListener('click', () => {
    fetch('/logout')
    .then( res => window.location.href = '/login');
});