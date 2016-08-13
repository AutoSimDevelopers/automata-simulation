//Simulator for the simulation of the automata
function DFA($scope) {
    "use strict";
    //selfReference
    //for debug purposes better way for accessing in console?
    window.debugScope = $scope;
    //Debug Mode (that the browser doesn't ask if you want to reload, or for the unit testing)
    $scope.debug = true;

    //Default Config for the automaton
    $scope.defaultConfig = {};
    //the default prefix for auto naming for example S0,S1,... after the prefix it saves the id
    $scope.defaultConfig.statePrefix = 'S';
    //Suffix after a transition name on the statediagram
    $scope.defaultConfig.transitionNameSuffix = '|';
    $scope.defaultConfig.diagram = {
        x: 0,
        y: 0,
        scale: 1,
        updatedWithZoomBehavior: false
    };
    //Number of statesIds given to states
    $scope.defaultConfig.countStateId = 0;
    //Number of transitionIds given to transitions
    $scope.defaultConfig.countTransitionId = 0;
    //The States are saved like {id:stateId,name:"nameoftheState",x:50,y:50}
    $scope.defaultConfig.states = [];
    //Only a number representing the id of the state
    $scope.defaultConfig.startState = null;
    //An array of numbers representing the ids of the finalStates
    $scope.defaultConfig.finalStates = [];
    //the transitions are saved like{fromState:stateId, toState:stateId, name:"transitionName"}
    $scope.defaultConfig.transitions = [];
    //alphabet
    $scope.defaultConfig.alphabet = [];
    //the name of the inputWord
    $scope.defaultConfig.inputWord = '';
    //the default name
    $scope.defaultConfig.name = "Untitled Automaton";
    //if there is something unsaved
    $scope.defaultConfig.unSavedChanges = false;
    //has the drawn Transition
    //{fromState:0,toState:0,names:["a","b"], objReference:};
    //if there is already a transition with the right fromState and toState, then only add myName to the names array
    $scope.defaultConfig.drawnTransitions = [];

    //Config Object
    $scope.config = cloneObject($scope.defaultConfig);

    //Array of all update Listeners
    $scope.updateListeners = [];

    //the simulator controlling the simulation
    $scope.simulator = new SimulationDFA($scope);
    // the table where states and transitions are shown
    $scope.table = new TableDFA($scope);
    //the statediagram controlling the svg diagram
    $scope.statediagram = new StateDiagramDFA($scope, "#diagram-svg");
    //the statetransitionfunction controlling the statetransitionfunction-table
    $scope.statetransitionfunction = new StatetransitionfunctionDFA($scope);
    //for the test data
    $scope.testData = new TestData($scope);

    //for the showing/hiding of the Input Field of the automaton name
    $scope.inNameEdit = false;

    /**
     * Add the options to the modal.
     * @param newTitle
     * @param newDescription
     * @param action
     * @param button
     */
    $scope.showModalWithMessage = function (newTitle, newDescription, action, button) {
        $scope.title = newTitle;
        $scope.description = newDescription;
        $scope.modalAction = action;
        if (button === undefined) {
            $scope.button = "MODAL_BUTTON.PROCEED";
        } else {
            $scope.button = button;
        }
        //change it to angular function
        $("#modal").modal();
    };

    /**
     * Executes the modal action-> when clicking on the action button
     */
    $scope.executeModalAction = function () {
        $scope.$eval($scope.modalAction);
    };

    /**
     * Options for the stepTimeOut-Slider
     */
    $scope.stepTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 3000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Options for the loopTimeOut-Slider
     */
    $scope.loopTimeOutSlider = {
        options: {
            floor: 0,
            step: 100,
            ceil: 4000,
            hideLimitLabels: true,
            translate: function (value) {
                return value + ' ms';
            }
        }
    };

    /**
     * Leave the input field after clicking the enter button
     */
    $scope.keypressCallback = function ($event) {
        if ($event.charCode == 13) {
            document.getElementById("automatonNameEdit").blur();
        }
    };

    /**
     * Prevent leaving site
     */
    window.onbeforeunload = function (event) {
        //turn true when you want the leaving protection
        if (!$scope.debug && $scope.config.unSavedChanges) {
            var closeMessage = "All Changes will be Lost. Save before continue!";
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = closeMessage;
            }
            return closeMessage;

        }
    };

    /**
     * Saves the automata
     */
    $scope.saveAutomaton = function () {
        $scope.config.unSavedChanges = false;

    };

    //from https://coderwall.com/p/ngisma/safe-apply-in-angular-js
    //fix for $apply already in progress
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

    /**
     * Removes the current automata and the inputWord
     */
    $scope.resetAutomaton = function () {
        //clear the svgContent
        $scope.statediagram.clearSvgContent();
        $scope.simulator.reset();

        //get the new config
        $scope.config = cloneObject($scope.defaultConfig);
        $scope.safeApply();
        $scope.updateListener();
    };

    /**
     * Adds a char to the input alphabet if the char is not available
     * @param   {value} value the char, which is to be added
     */
    $scope.addToAlphabet = function (value) {
        if (!_.some($scope.config.alphabet, function (a) {
                return a === value;
            })) {
            $scope.config.alphabet.push(value);
        } else {

        }

    };

    /**
     * Removes a char from the alphabet if this char is only used from the given transition
     * @param   {number}  transitionId
     * @returns {boolean} true if it was removed false if not removed
     */
    $scope.removeFromAlphabetIfNotUsedFromOthers = function (transitionId) {
        var tmpTransition = $scope.getTransitionById(transitionId);
        //search if an other transition use the same name
        var usedByOthers = false;
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if (tmpTransition.name === $scope.config.transitions[i].name && $scope.config.transitions[i].id !== transitionId) {
                usedByOthers = true;
                break;
            }
        }

        if (!usedByOthers) {
            _.pull($scope.config.alphabet, tmpTransition.name);
            return true;
        } else {
            return false;
        }
    };

    /**
     * This function calls the method updateFunction of every element in $scope.updateListeners
     */
    $scope.updateListener = function () {
        //call each updateListener
        _.forEach($scope.updateListeners, function (value) {
            value.updateFunction();
        });
        //after every update we show the user that he has unsaved changes
        $scope.config.unSavedChanges = true;

    };

    //STATE FUNCTIONS START

    /**
     * Checks if a state exists with the given name
     * @param  {String}  stateName
     * @param {Number} stateID optionally don't check with this stateID
     * @return {Boolean}
     */
    $scope.existsStateWithName = function (stateName, stateID) {
        var tmp = false;
        _.forEach($scope.config.states, function (state) {
            if (state.name == stateName && state.id !== stateID) {
                tmp = true;
                return false;
            }
        });
        return tmp;
    };

    /**
     * Checks if a state exists with the given id
     * @param  {Number} stateId
     * @return {Boolean}
     */
    $scope.existsStateWithId = function (stateId) {
        for (var i = 0; i < $scope.config.states.length; i++) {
            if ($scope.config.states[i].id == stateId)
                return true;
        }
        return false;
    };

    /**
     * returns if the node has transitions
     * @param  {number}  stateId
     * @return {Boolean}
     */
    $scope.hasStateTransitions = function (stateId) {
        var tmp = false;
        _.forEach($scope.config.transitions, function (transition) {
            if (transition.fromState == stateId || transition.toState == stateId) {
                tmp = true;
            }
        });
        return tmp;
    };

    /**
     * Get the array index from the state with the given stateId
     * @param  {number} stateId
     * @return {number}         Returns the index and -1 when state with stateId not found
     */
    $scope.getArrayStateIdByStateId = function (stateId) {
        return _.findIndex($scope.config.states, function (state) {
            if (state.id == stateId) {
                return state;
            }
        });
    };

    /**
     * Returns the State with the given stateId
     * @param  {number} stateId
     * @return {object}        Returns the objectReference of the state undefined if not found
     */
    $scope.getStateById = function (stateId) {

        return $scope.config.states[$scope.getArrayStateIdByStateId(stateId)];
    };

    /**
     * Returns the State with the given stateName
     * @param stateName
     */
    $scope.getStateByName = function (stateName) {
        var tmp = -1;
        _.forEach($scope.config.states, function (value) {
            if (stateName === value.name) {
                tmp = value.id;
                return false;
            }
        });
        return tmp === -1 ? undefined : $scope.config.states[$scope.getArrayStateIdByStateId(tmp)];
    };
    /**
     * Add a state with default name
     * @param {number} x
     * @param {number} y
     * @returns {object} the created object
     */
    $scope.addStateWithPresets = function (x, y) {
        var obj = $scope.addState(($scope.config.statePrefix + $scope.config.countStateId), x, y);
        //if u created a state then make the first state as startState ( default)
        if ($scope.config.countStateId == 1) {
            $scope.changeStartState(0);
        }
        return obj;
    };

    /**
     * Adds a state at the end of the states array
     * @param {String} stateName
     * @param {number} x
     * @param {number} y
     * @returns {object} the created object
     */
    $scope.addState = function (stateName, x, y) {
        if (!$scope.existsStateWithName(stateName)) {
            return $scope.addStateWithId($scope.config.countStateId++, stateName, x, y);
        } else {
            //TODO: BETTER DEBUG
            return null;
        }
    };

    /**
     * Adds a state at the end of the states array with a variable id
     * !!!don't use at other places!!!!
     * @param stateId
     * @param {String} stateName
     * @param {number} x
     * @param {number} y
     * @returns {object} the created object
     */
    $scope.addStateWithId = function (stateId, stateName, x, y) {
        $scope.config.states.push(new State(stateId, stateName, x, y));
        //draw the State after the State is added
        $scope.statediagram.drawState(stateId);
        $scope.updateListener();
        //fix changes wont update after addTransition from the statediagram
        $scope.safeApply();
        return $scope.getStateById(stateId);
    };

    /**
     * Removes the state with the given id
     * @param  {number} stateId
     */
    $scope.removeState = function (stateId) {
        if ($scope.hasStateTransitions(stateId)) {
            //TODO: BETTER DEBUG
            $scope.showModalWithMessage('STATE_MENU.DELETE_MODAL_TITLE', 'STATE_MENU.DELETE_MODAL_DESC', 'forcedRemoveState(' + stateId + ')', 'MODAL_BUTTON.DELETE');
        } else {
            //if the state is a final state move this state from the final states
            if ($scope.isStateAFinalState(stateId)) {
                $scope.removeFinalState(stateId);
            }
            //if state is a start State remove the state from the startState
            if ($scope.config.startState == stateId) {
                $scope.config.startState = null;
            }
            //first remove the element from the svg after that remove it from the array
            $scope.statediagram.removeState(stateId);
            $scope.config.states.splice($scope.getArrayStateIdByStateId(stateId), 1);
            //update the other listeners when remove is finished
            $scope.updateListener();
        }
    };

    $scope.forcedRemoveState = function (stateId) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var tmpTransition = $scope.config.transitions[i];
            if (tmpTransition.fromState === stateId || tmpTransition.toState === stateId) {
                $scope.removeTransition(tmpTransition.id);
                i--;
            }
        }
        $scope.removeState(stateId);
    };

    /**
     * Rename a state if the newStateName isn't already used
     * @param  {number}  stateId
     * @param  {State}   newStateName
     * @returns {boolean} true if success false if no success
     */
    $scope.renameState = function (stateId, newStateName) {
        if ($scope.existsStateWithName(newStateName)) {
            //TODO: BETTER DEBUG
            return false;
        } else {
            $scope.getStateById(stateId).name = newStateName;
            //Rename the state on the statediagram
            $scope.statediagram.renameState(stateId, newStateName);
            $scope.updateListener();
            return true;
        }
    };

    /**
     * Changes the start state to the given state id
     */
    $scope.changeStartState = function (stateId) {
        if ($scope.existsStateWithId(stateId)) {
            //change on statediagram and others
            $scope.statediagram.changeStartState(stateId);
            //change the startState then
            $scope.config.startState = stateId;

            //update the listeners after the startState is set
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Removes the start state
     */
    $scope.removeStartState = function () {
        //TODO What is dis
        if ($scope.config.startState !== null) {
            //change on statediagram and others
            $scope.statediagram.removeStartState();
            $scope.updateListener();
            //change the startState
            $scope.config.startState = null;
        }

    };

    /**
     * Returns the Index of the saved FinalState
     * @param  {number} stateId
     * @return {number}
     */
    $scope.getFinalStateIndexByStateId = function (stateId) {
        return _.indexOf($scope.config.finalStates, stateId);
    };

    /**
     * Returns if the state is a finalState
     * @param  {number} stateId
     * @return {Boolean}
     */
    $scope.isStateAFinalState = function (stateId) {
        for (var i = 0; i < $scope.config.finalStates.length; i++) {
            if ($scope.config.finalStates[i] == stateId)
                return true;
        }
        return false;
    };

    /**
     * Add a state as final State if it isn't already added and if their is a state with such a id
     */
    $scope.addFinalState = function (stateId) {
        if (!$scope.isStateAFinalState(stateId)) {
            $scope.config.finalStates.push(stateId);
            //add to the statediagram
            $scope.statediagram.addFinalState(stateId);
            $scope.updateListener();
        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Remove a state from the final states
     * @return {[type]} [description]
     */
    $scope.removeFinalState = function (stateId) {
        if ($scope.isStateAFinalState(stateId)) {
            //remove from statediagram
            $scope.statediagram.removeFinalState(stateId);
            $scope.updateListener();
            $scope.config.finalStates.splice($scope.getFinalStateIndexByStateId(stateId), 1);
        } else {
            //TODO: Better DEBUG
        }
    };

//TRANSITIONS

    /**
     * Checks if a transition with the params already exists
     * @param  {number}  fromState      Id of the fromState
     * @param  {number}  toState        id from the toState
     * @param  {String}  transitionName The name of the transition
     * @param transitionId
     * @return {Boolean}
     */
    $scope.existsTransition = function (fromState, toState, transitionName, transitionId) {
        var tmp = false;
        _.forEach($scope.config.transitions, function (transition) {
            if (transition.fromState == fromState && transition.name == transitionName && transition.id !== transitionId) {
                tmp = true;
                return false;
            }
        });

        return tmp;
    };

    /**
     * Return the next possible transitionName (a,b,c already used -> returns d)
     * @param fromState
     * @returns {string}
     */
    $scope.getNextTransitionName = function (fromState) {
        var namesArray = [];
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            if ($scope.config.transitions[i].fromState == fromState) {
                namesArray.push($scope.config.transitions[i].name);
            }
        }
        var foundNextName = false;
        var tryChar = "a";
        while (!foundNextName) {
            var value = _.indexOf(namesArray, tryChar);
            if (value === -1) {
                foundNextName = true;
            } else {
                //noinspection JSCheckFunctionSignatures
                tryChar = String.fromCharCode(tryChar.charCodeAt() + 1);
            }
        }
        return tryChar;

    };

    /**
     * Adds a transition at the end of the transitions array
     * @param {number} fromState      The id from the fromState
     * @param {number} toState        The id from the toState
     * @param transitionName
     */
    $scope.addTransition = function (fromState, toState, transitionName) {
        //can only create the transition if it is unique-> not for the ndfa
        //there must be a fromState and toState, before adding a transition
        if (!$scope.existsTransition(fromState, toState, transitionName) && $scope.existsStateWithId(fromState) && $scope.existsStateWithId(toState)) {
            $scope.addToAlphabet(transitionName);
            return $scope.addTransitionWithId($scope.config.countTransitionId++, fromState, toState, transitionName);

        } else {
            //TODO: BETTER DEBUG
        }
    };

    /**
     * Adds a transition at the end of the transitions array -> for import
     * !!!don't use at other places!!!!! ONLY FOR IMPORT
     * @param transitionId
     * @param fromState
     * @param toState
     * @param transitionName
     */
    $scope.addTransitionWithId = function (transitionId, fromState, toState, transitionName) {
        $scope.config.transitions.push(new TransitionDFA(transitionId, fromState, toState, transitionName));

        //drawTransition
        $scope.statediagram.drawTransition(transitionId);
        $scope.updateListener();
        //fix changes wont update after addTransition from the statediagram
        $scope.safeApply();
        return $scope.getTransitionById(transitionId);
    };

    /**
     * Get the array index from the transition with the given transitionId
     * @param  {number} transitionId
     * @return {number}         Returns the index and -1 when state with transitionId not found
     */
    $scope.getArrayTransitionIdByTransitionId = function (transitionId) {
        return _.findIndex($scope.config.transitions, function (transition) {
            if (transition.id == transitionId) {
                return transition;
            }
        });
    };

    /**
     * Returns the transition of the given transitionId
     * @param  {number} transitionId
     * @return {object}        Returns the objectReference of the state
     */
    $scope.getTransitionById = function (transitionId) {
        return $scope.config.transitions[$scope.getArrayTransitionIdByTransitionId(transitionId)];
    };

    /**
     * Returns the transition with the given information
     * @param  {number}  fromState      Id of the fromState
     * @param  {number}  toState        id from the toState
     * @param  {String}  transitionName The name of the transition
     * @return {Object}
     */
    $scope.getTransition = function (fromState, toState, transitionName) {
        for (var i = 0; i < $scope.config.transitions.length; i++) {
            var transition = $scope.config.transitions[i];
            if (transition.fromState == fromState && transition.toState == toState && transition.name == transitionName) {
                return transition;
            }
        }
        return undefined;
    };

    /**
     * Removes the transition
     * @param {number} transitionId      The id from the transition
     */
    $scope.removeTransition = function (transitionId) {
        //remove old transition from alphabet if this transition only used this char
        $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
        //first remove the element from the svg after that remove it from the array
        $scope.statediagram.removeTransition(transitionId);
        $scope.config.transitions.splice($scope.getArrayTransitionIdByTransitionId(transitionId), 1);
        //update other listeners when remove is finished
        $scope.updateListener();
    };

    /**
     * Modify a transition if is unique with the new name
     * @param  {number} transitionId
     * @param  {String} newTransitionName
     */
    $scope.modifyTransition = function (transitionId, newTransitionName) {
        var transition = $scope.getTransitionById(transitionId);
        if (!$scope.existsTransition(transition.fromState, transition.toState, newTransitionName)) {
            //remove old transition from alphabet if this transition only used this char
            $scope.removeFromAlphabetIfNotUsedFromOthers(transitionId);
            //add new transitionName to the alphabet
            $scope.addToAlphabet(newTransitionName);
            //save the new transitionName
            $scope.getTransitionById(transitionId).name = newTransitionName;
            //Rename the state on the statediagram
            $scope.statediagram.modifyTransition(transition.fromState, transition.toState, transitionId, newTransitionName);
            $scope.updateListener();
            return true;
        } else {
            //TODO: BETTER DEBUG
            return false;
        }
    };
}