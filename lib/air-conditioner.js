const API = require('./air-conditioner-api');
const State = require('./state');
const OpMode = require('./op-mode');
const Direction = require('./direction');
const WindLevel = require('./wind-level');
const Power = require('./power');
const mapper = require('./mapper');
const moment = require('moment');

var Service, Characteristic, FakeGatoHistoryService, HomebridgeAPI;

module.exports = function (homebridge) {
    FakeGatoHistoryService = require('fakegato-history')(homebridge);
    HomebridgeAPI = homebridge;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    mapper.setCharacteristic(Characteristic);
    homebridge.registerAccessory("homebridge-samsung-aircon", "Samsung Aircon", AirConditioner);
};

function AirConditioner(log, config) {
    this.log = log;
    this.name = config["name"];
    this.tolerance = config["tolerance"] || 1;
    this.duid = config["mac"].replace(/:/g, '').replace(/\-/g, '');
    
    this.currentDeviceState = {};
    // Set initial state. Done only to not deal with nulls if getters are called before first connection.
    this.currentDeviceState[State.Power] = 'Off';
    this.currentDeviceState[State.TempNow] = 20;
    this.currentDeviceState[State.TempSet] = 20;
    this.currentDeviceState[State.OpMode] = OpMode.Auto;
    this.currentDeviceState[State.Direction] = Direction.Fixed;
    this.currentDeviceState[State.WindLevel] = WindLevel.Auto;
    this.currentDeviceState[State.MaxTemp] = Number(20);
    this.currentDeviceState[State.MinTemp] = Number(20);
    
    this.init = true;
    //this.log("Initial State:", this.currentDeviceState);
    
    this.api = new API(config["ip_address"], this.duid, config["token"], log, config["log_socket_activity"] === true, config["keep_alive"]);
    //this.api = new API(config["ip_address"], this.duid, config["token"], log,  true, config["keep_alive"]);
    
};

AirConditioner.prototype = {
getServices: function() {
    this.api.connect();
    
    this.api
    .on('stateUpdate', this.updateState.bind(this));
    
    this.acService = new Service.HeaterCooler(this.name);
    
    // ACTIVE STATE
    this.acService
    .getCharacteristic(Characteristic.Active)
    .on('get', this.getActive.bind(this))
    .on('set', this.setActive.bind(this));
    
    // CURRENT TEMPERATURE
    this.acService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({
    minValue: 0,
    maxValue: 100,
    minStep: 1
    })
    .on('get', this.getCurrentTemperature.bind(this));
    
    // TARGET TEMPERATURE
    this.acService
    .getCharacteristic(Characteristic.TargetTemperature)
    .setProps({
    minValue: 0,
    maxValue: 100,
    minStep: 1
    })
    .on('get', this.getTargetTemperature.bind(this))
    .on('set', this.setTargetTemperature.bind(this));
    
    this.acService
    .getCharacteristic(Characteristic.CoolingThresholdTemperature)
    .setProps({
    minValue: 16,
    maxValue: 30,
    minStep: 1
    })
    .on('get', this.getMaxTemperature.bind(this))
    .on('set', this.setMaxTemperature.bind(this));
    
    this.acService
    .getCharacteristic(Characteristic.HeatingThresholdTemperature)
    .setProps({
    minValue: 16,
    maxValue: 30,
    minStep: 1
    })
    .on('get', this.getMinTemperature.bind(this))
    .on('set', this.setMinTemperature.bind(this));
    
    // TARGET STATE
    this.acService
    .getCharacteristic(Characteristic.TargetHeaterCoolerState)
    .on('get', this.getTargetState.bind(this))
    .on('set', this.setTargetState.bind(this));
    
    // CURRENT STATE
    this.acService
    .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
    .on('get', this.getCurrentState.bind(this));
    
    // SWING MODE
    this.acService
    .getCharacteristic(Characteristic.SwingMode)
    .on('get', this.getSwingMode.bind(this))
    .on('set', this.setSwingMode.bind(this));
    
    // ROTATION SPEED
    this.acService
    .getCharacteristic(Characteristic.RotationSpeed)
    .on('get', this.getRotationSpeed.bind(this))
    .on('set', this.setRotationSpeed.bind(this));
    
    this.historyService = new FakeGatoHistoryService('thermo', this, {
    storage: 'fs',
    disableTimer: true,
    path: HomebridgeAPI.user.cachedAccessoryPath()
    });
    
    const package = require('../package.json');
    const informationService = new Service.AccessoryInformation();
    informationService
    .setCharacteristic(Characteristic.SerialNumber, this.duid)
    .setCharacteristic(Characteristic.Manufacturer, package.author)
    .setCharacteristic(Characteristic.Model, package.name)
    .setCharacteristic(Characteristic.FirmwareRevision, package.version);
    
    this.getHistory();
    
    return [this.acService, informationService, this.historyService];
},
    
getHistory: function() {
    const self = this;
    self.historyService.addEntry({
    time: moment().unix(),
    currentTemp:this.currentDeviceState[State.TempNow],
    setTemp:this.currentDeviceState[State.TempSet],
        valvePosition:this.currentDeviceState[State.WindLevel]});
    setTimeout(function() {
        self.getHistory();
    }, 8 * 60 * 1000); //every 8 mins
},
    
    // GETTERS
getActive: function (callback) {
    const power = this.currentDeviceState[State.Power];
    const isActive = mapper.ActivefromPower(power);
    this.log('Getting active...', isActive);
    callback(null, isActive);
},
    
getCurrentTemperature: function (callback) {
    const currentTemperature = this.currentDeviceState[State.TempNow];
    this.log('Getting current temperature...', currentTemperature);
    callback(null, currentTemperature);
},
    
getTargetTemperature: function(callback) {
    const targetTemperature = this.currentDeviceState[State.TempSet];
    this.log('Getting target temperature...', targetTemperature);
    callback(null, targetTemperature);
},
    
getMaxTemperature: function(callback) {
    const maxTemperature = this.currentDeviceState[State.MaxTemp];
    this.log('Getting max temperature...', maxTemperature);
    callback(null, maxTemperature);
},
    
getMinTemperature: function(callback) {
    const minTemperature = this.currentDeviceState[State.MinTemp];
    this.log('Getting min temperature...', minTemperature);
    callback(null, minTemperature);
},
    
getTargetState: function (callback) {
    const opMode = this.currentDeviceState[State.OpMode];
    const targetState = mapper.targetStateFromOpMode(opMode);
    this.log('Getting target state...', targetState);
    callback(null, targetState);
},
    
getCurrentState: function (callback) {
    const currentState = this.currentHeaterCoolerState();
    this.log('Getting current state...', currentState);
    callback(null, currentState);
},
    
getSwingMode: function (callback) {
    const direction = this.currentDeviceState[State.Direction];
    const isOscillating = direction === Direction.SwingUpDown
    this.log('Getting swing mode...', isOscillating);
    callback(null, isOscillating);
},
    
getRotationSpeed: function(callback) {
    const windLevel = this.currentDeviceState[State.WindLevel];
    const rotationSpeed = mapper.rotationSpeedFromWindLevel(windLevel);
    this.log('Getting rotation speed...', rotationSpeed);
    callback(null, rotationSpeed);
},
    
    // SETTERS
setActive: function (isActive, callback) {
    this.log('Setting active:', isActive);
    this.api.deviceControl(State.Power, mapper.PowerfromActive(isActive), function (err) {
        if (!!err) this.log('Active set');
        callback(err);
    }.bind(this));
},
    
    
setTargetTemperature: function(temperature, callback) {
    this.log('Setting  temperature:', temperature);
    this.api.deviceControl(State.TempSet, temperature, function (err) {
        if (!!err) this.log('Target temperature set');
        callback(err);
    }.bind(this));
},
    
setMinTemperature: function(temperature, callback) {
    const maxt = this.currentDeviceState[State.MaxTemp];
    this.log('Setting min temperature:', temperature);
    this.updateLimits(temperature, maxt);
    const newTarget_min = this.currentTargetTemp_minmax(temperature, maxt);
    this.log('Setting temperature:', newTarget_min);
    this.api.deviceControl(State.TempSet, newTarget_min, function (err) {
        if (!!err) this.log('Target temperature set');
        callback(err);
    }.bind(this));
},
    
setMaxTemperature: function(temperature, callback) {
    const mint = this.currentDeviceState[State.MinTemp];
    this.log('Setting max temperature:', temperature);
    this.updateLimits(mint, temperature);
    const newTarget_max = this.currentTargetTemp_minmax(mint, temperature);
    this.log('Setting temperature:', newTarget_max);
    this.api.deviceControl(State.TempSet, newTarget_max, function (err) {
        if (!!err) this.log('Target temperature set');
        callback(err);
    }.bind(this));
},
    
setTargetState: function (state, callback) {
    this.log('Setting target state:', state);
    this.api.deviceControl(State.OpMode, mapper.opModeFromTargetState(state), function (err) {
        if (!!err) this.log('Target state set');
        callback(err);
    }.bind(this));
},
    
setSwingMode: function (enabled, callback) {
    this.log('Setting swing mode:', enabled);
    this.api.deviceControl(State.Direction, enabled ? Direction.SwingUpDown : Direction.Fixed, function (err) {
        if (!!err) this.log('Swing mode set');
        callback(err);
    }.bind(this));
},
    
setRotationSpeed: function(speed, callback) {
    this.log('Setting rotation speed:', speed);
    this.api.deviceControl(State.WindLevel, mapper.windLevelFromRotationSpeed(speed), function(err) {
        if (!!err) this.log('Rotation speed set');
        callback(err);
    }.bind(this));
},
    
updateLimits: function(t1, t2) {
    const opMode = this.currentDeviceState[State.OpMode];
    let derivedstate = {};
    derivedstate[State.MinTemp] = t1;
    derivedstate[State.MaxTemp] = t2;
    if (opMode === OpMode.Auto){
        derivedstate[State.MinTemp] = Math.min(t1, t2);
        derivedstate[State.MaxTemp] = Math.max(t1, t2);
    }
    this.currentDeviceState = Object.assign({}, this.currentDeviceState, derivedstate);
    // Update characteristics which correspond to updated states
    Object.keys(derivedstate).forEach(function(key) {
        this.updateCharacteristic(key, derivedstate[key]);
    }.bind(this));
},
    
updateMax: function(t1) {
    let derivedstate = {};
    derivedstate[State.MaxTemp] = t1;
    this.currentDeviceState = Object.assign({}, this.currentDeviceState, derivedstate);
    this.updateCharacteristic(State.MaxTemp, t1);
},
    
updateMin: function(t1) {
    let derivedstate = {};
    derivedstate[State.MinTemp] = t1;
    this.currentDeviceState = Object.assign({}, this.currentDeviceState, derivedstate);
    this.updateCharacteristic(State.MinTemp, t1);
},
    
updateState: function (stateUpdate) {
    this.log("State updated:", JSON.stringify(stateUpdate, Object.values(State)));
    // Merge state update into current device state
    this.currentDeviceState = Object.assign({}, this.currentDeviceState, stateUpdate);
    // Update characteristics which correspond to updated states
    Object.keys(stateUpdate).forEach(function(key) {
        this.updateCharacteristic(key, stateUpdate[key]);
    }.bind(this));
    this.updateDerivedCharacteristics();
},
    
updateCharacteristic: function(name, value) {
    var characteristic;
    var mappedValue;
    
    switch (name) {
        case State.Power:
            characteristic = Characteristic.Active;
            mappedValue = mapper.ActivefromPower(value);
            break;
        case State.TempNow:
            characteristic = Characteristic.CurrentTemperature;
            mappedValue = value;
            break;
        case State.TempSet:
            characteristic = Characteristic.TargetTemperature;
            mappedValue = value;
            break;
        case State.MaxTemp:
            characteristic = Characteristic.CoolingThresholdTemperature;
            mappedValue = value;
            break;
        case State.MinTemp:
            characteristic = Characteristic.HeatingThresholdTemperature;
            mappedValue = value;
            break;
        case State.OpMode:
            characteristic = Characteristic.TargetHeaterCoolerState;
            mappedValue = mapper.targetStateFromOpMode(value);
            break;
        case State.Direction:
            characteristic = Characteristic.SwingMode;
            mappedValue = value === Direction.SwingUpDown;
            break;
        case State.WindLevel:
            characteristic = Characteristic.RotationSpeed;
            mappedValue = mapper.rotationSpeedFromWindLevel(value);
            break;
        case State.CurrentState:
            characteristic = Characteristic.CurrentHeaterCoolerState;
            mappedValue = value;
            break;
    }
    
    if(!!characteristic) {
        this.acService.getCharacteristic(characteristic).updateValue(mappedValue);
    }
},
    
    
updateDerivedCharacteristics: function() {
    if (this.init){
        const tset = Number(this.currentDeviceState[State.TempSet]);
        let derivedstate = {};
        derivedstate[State.MinTemp] = Number(tset);
        derivedstate[State.MaxTemp] = Number(tset);
        
        this.currentDeviceState = Object.assign({}, this.currentDeviceState, derivedstate);
        Object.keys(derivedstate).forEach(function(key) {
            this.updateCharacteristic(key, derivedstate[key]);
        }.bind(this));
        
        let currentstate = {};
        currentstate[State.CurrentState] = this.currentHeaterCoolerState();
        this.currentDeviceState = Object.assign({}, this.currentDeviceState, derivedstate);
        this.updateCharacteristic(State.CurrentState, currentstate[State.CurrentState]);
        
        this.init = false;
    } else {
        
        const opMode = this.currentDeviceState[State.OpMode];
        const t_maxtemp = this.currentDeviceState[State.MaxTemp];
        const t_mintemp = this.currentDeviceState[State.MinTemp];
        
        if (opMode === OpMode.Auto && t_maxtemp < t_mintemp ){
            this.updateLimits(t_mintemp, t_maxtemp);
        }
        
        
        let currentstate = {};
        currentstate[State.CurrentState] = this.currentHeaterCoolerState();
        this.currentDeviceState = Object.assign({}, this.currentDeviceState, currentstate);
        this.updateCharacteristic(State.CurrentState, currentstate[State.CurrentState]);
        
        let newtargetPost = this.currentTargetTemp();
        const previousTargetPost = this.currentDeviceState[State.TempSet];
        if(newtargetPost != previousTargetPost){
            this.log('Update Target Temp:', newtargetPost);
            this.acService.getCharacteristic(Characteristic.TargetTemperature).setValue(newtargetPost);
        }
    }
},
    
currentHeaterCoolerState: function() {
    const isActive = this.currentDeviceState[State.Power];
    const currentTemperature = this.currentDeviceState[State.TempNow];
    const opMode = this.currentDeviceState[State.OpMode];
    const maxtemp = this.currentDeviceState[State.MaxTemp];
    const mintemp = this.currentDeviceState[State.MinTemp];
    var state;
    if (isActive === 'Off') {
        state = Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }
    else if (opMode === OpMode.Cool){
        if (currentTemperature > maxtemp) {
            state = Characteristic.CurrentHeaterCoolerState.COOLING;
        } else {
            state = Characteristic.CurrentHeaterCoolerState.IDLE;
        }
    } else if (opMode === OpMode.Heat) {
        if (currentTemperature < mintemp) {
            state = Characteristic.CurrentHeaterCoolerState.HEATING;
        } else {
            state = Characteristic.CurrentHeaterCoolerState.IDLE;
        }
    } else if (opMode === OpMode.Auto) {
        if (currentTemperature < Math.min(mintemp, maxtemp)){
            state = Characteristic.CurrentHeaterCoolerState.HEATING;
        } else if ( currentTemperature > Math.max(mintemp, maxtemp)){
            state = Characteristic.CurrentHeaterCoolerState.COOLING;
        } else {
            state = Characteristic.CurrentHeaterCoolerState.IDLE;
        }
    } else {
        state = Characteristic.CurrentHeaterCoolerState.IDLE;
    }
    return state;
},
    
currentTargetTemp: function() {
    const state = this.currentDeviceState[State.OpMode];
    const currentTemperature = this.currentDeviceState[State.TempNow];
    const previousTarget = this.currentDeviceState[State.TempSet];
    const maxtemp = this.currentDeviceState[State.MaxTemp];
    const mintemp = this.currentDeviceState[State.MinTemp];
    const tol = this.tolerance;
    var temp;
    if (state === OpMode.Cool){
        temp = maxtemp;
    } else if (state === OpMode.Heat){
        temp = mintemp;
    } else if (state === OpMode.Auto) {
        if ( currentTemperature > Math.max(mintemp, maxtemp)){
            temp = Math.max(mintemp, maxtemp);
        } else if (currentTemperature < Math.min(mintemp, maxtemp)){
            temp = Math.min(mintemp, maxtemp);
        } else if (Math.abs(Number(currentTemperature) - Number(previousTarget)) > tol ){
            temp = currentTemperature;
        } else {
            temp = previousTarget;
        }
    } else {
        temp = previousTarget;
    }
    
    return temp;
},
    
    
currentTargetTemp_minmax: function(t1, t2) {
    const state = this.currentDeviceState[State.OpMode];
    const currentTemperature = this.currentDeviceState[State.TempNow];
    const previousTarget = this.currentDeviceState[State.TempSet];
    const maxtemp = t2;
    const mintemp = t1;
    const tol = this.tolerance;
    var temp;
    if (state === OpMode.Cool){
        temp = maxtemp;
    } else if (state === OpMode.Heat){
        temp = mintemp;
    } else if (state === OpMode.Auto) {
        if ( currentTemperature > Math.max(mintemp, maxtemp)){
            temp = Math.max(mintemp, maxtemp);
        } else if (currentTemperature < Math.min(mintemp, maxtemp)){
            temp = Math.min(mintemp, maxtemp);
        } else if (Math.abs(Number(currentTemperature) - Number(previousTarget)) > tol ){
            temp = currentTemperature;
        } else {
            temp = previousTarget;
        }
    } else {
        temp = previousTarget;
    }
    return temp;
},
    
};
