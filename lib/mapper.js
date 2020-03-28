const OpMode = require('./op-mode');
const WindLevel = require('./wind-level');

var Characteristic;

module.exports.setCharacteristic = function(characteristic) {
    Characteristic = characteristic;
}

module.exports.opModeFromTargetState = function (targetState) {
    switch (targetState) {
        case Characteristic.TargetHeaterCoolerState.COOL: return OpMode.Cool;
        case Characteristic.TargetHeaterCoolerState.HEAT: return OpMode.Heat;
        case Characteristic.TargetHeaterCoolerState.AUTO: return OpMode.Auto;
    }
};

module.exports.targetStateFromOpMode = function (targetState) {
    switch (targetState) {
        case OpMode.Cool: return Characteristic.TargetHeaterCoolerState.COOL;
        case OpMode.Heat: return Characteristic.TargetHeaterCoolerState.HEAT;
        case OpMode.Auto: return Characteristic.TargetHeaterCoolerState.AUTO;
    }
};

module.exports.rotationSpeedFromWindLevel = function (windLevel) {
    switch (windLevel) {
        case WindLevel.Auto: return 0;
        case WindLevel.Low: return 30;
        case WindLevel.Mid: return 60;
        case WindLevel.High: return 90;
        case WindLevel.Turbo: return 100;
    }
};

module.exports.windLevelFromRotationSpeed = function (rotationSpeed) {
    if (rotationSpeed == 0) {
        return WindLevel.Auto;
    } else if (rotationSpeed <= 30) {
        return WindLevel.Low;
    } else if (rotationSpeed <= 60) {
        return WindLevel.Mid;
    } else if (rotationSpeed <= 90) {
        return WindLevel.High;
    } else {
        return WindLevel.Turbo;
    }
}
