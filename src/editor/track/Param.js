'use strict';

var EventEmitter = require('eventman');
var inherits = require('inherits');
var defineCompactProperty = require('../utils/defineCompactProperty');
var Key = require('../utils/Key');
var OptionLine = require('../utils/OptionLine');
var KeyLine = require('../utils/KeyLine');
var amgui = require('../amgui');

function Param (opt={}) {

    EventEmitter.call(this);

    this._lineH =  amgui.LINE_HEIGHT;
    this._inputs = [];
    this._hidden = false;
    this._defaultValue = opt.defaultValue || 0;

    this._onChangeInput = this._onChangeInput.bind(this);
    this._onChangeTime = this._onChangeTime.bind(this);
    this._onChangeKeyLine = this._onChangeKeyLine.bind(this);
    this._onKeyNeedsRemove = this._onKeyNeedsRemove.bind(this);
    this._onClickTgglKey = this._onClickTgglKey.bind(this);
    this._onClickStepPrevKey = this._onClickStepPrevKey.bind(this);
    this._onClickStepNextKey = this._onClickStepNextKey.bind(this);

    this._createKeyline(opt.keyLine);
    this._createOptions(opt.optionLine);

    opt.keyLine.parentParam = this;

    this.deOptionLine = this.optionLine.domElem;
    this.deKeyLine = this.keyLine.domElem;

    this.setMaxListeners(1234);

    if (opt) {
        this.useSave(opt);
    }

    this.once('paramSet', () => {

        this.timeline.on('changeTime', this._onChangeTime);
    });
}

inherits(Param, EventEmitter);
var p = Param.prototype;
module.exports = Param;









Object.defineProperties(p, {

    height: {
        get: function () {
            
            return this.hidden ? 0 : this._lineH;
        }
    },
    name: {
        set: function (v) {

            if (v === this._name) return;

            this._name = v;
            this.optionLine.title = v;
        },
        get: function () {

            return this._name;
        }
    },
    hidden: {
        set: function (v) {

            v = !!v;

            if (v === this._hidden) return;

            this._hidden = v;
            
            this.keyLine.hidden = v;
            this.optionLine.hidden = v;

            this.emit('changeHeight');
        },
        get: function () {

            return this._hidden;
        }
    },
    timeline: {
        get: function () {
            return (this.parentTrack || this.parentGroup).timeline;
        }
    }
});

defineCompactProperty(p, [
    {name: 'parentGroup', eventName: 'parentSet'},
    {name: 'parentTrack', eventName: 'parentSet'},
]);



p.getSave = function () {

    var save = {
        name: this.name,
        hidden: this.hidden,
        keys: [],
    };

    this.keyLine.forEachKeys(function (key) {

        save.keys.push(key.getSave());
    });

    return save;
};

p.useSave = function(save) {

    this.name = save.name;
    this.hidden = save.hidden;

    if (save.keys) {

        save.keys.forEach(this.addKey, this);
    }
};

p.getScriptKeys = function (opt = {}) {

    var keys = [];

    this.keyLine.forEachKeys(function (key) {

        var k = {
            time: key.time,
            options: {
                ease: opt.runnable ? key.ease.getEaser() : key.ease.getScript(),
            }
        };
        k.options[this.name] = key.value;
        keys.push(k);
    }, this);

    return _.sortBy(keys, 'time');
};

p.getValue = function (time) {

    if (!_.isNumber(time)) {
        time = this.timeline.currTime;
    }

    var ret, before, after, same;

    this.keyLine.forEachKeys(function (key) {

        if (key.time === time) {
        
            same = key;
        }

        if (key.time < time && (!before || before.time < key.time)) {
        
            before = key;
        }

        if (key.time > time && (!after || after.time > key.time)) {
        
            after = key;
        }
    });

    if (same) {

        ret = same.value;
    }
    else {

        if (after && before) {

            var p = (time - before.time) / (after.time - before.time), 
                av = after.value, bv = before.value;

            p = after.ease.getRatio(p);

            ret = createCalc(av, bv, p);
        }
        else if (before) {
            
            ret = before.value;
        }
        else if (after) {
            
            ret = after.value;
        }
    }
    
    return ret === undefined ? this._defaultValue : ret;





    function createCalc(av, bv, p) {

        if (!isNaN(av) && !isNaN(bv)) {

            return parseFloat(bv) + ((av - bv) * p);
        }

        var aUnit = getUnit(av);
        var bUnit = getUnit(bv);
        
        if (aUnit === bUnit) {

            av = parseFloat(av);
            bv = parseFloat(bv);
            
            return (bv + ((av - bv) * p)) + aUnit;
        }

        var avs = _.compact(av.split(' ')),
            bvs = _.compact(bv.split(' ')),
            avl = avs.length,
            bvl = bvs.length,
            ret = [];

        if (avl !== bvl) {

            if (avl < bvl) {

                avs = avs.concat(bvs.slice(avl));
            }
            else {
                bvs = bvs.concat(avs.slice(bvl));
            }         
        }

        avs.forEach(function (a, idx) {

            ret.push(calc(a, bvs[idx]));
        });

        return ret.join(' ');

        function calc(a, b) {

            return 'calc(' + b + ' + (' + a + ' - ' + b + ')*' + p + ')';
        }

        function getUnit(v) {

            var m = /([a-z%]+)$/.exec(v);

            return m && m[1];
        }
    }
};

p.addKey = function (opt, skipHistory) {
    
    var key = this.getKey(opt.time);

    if (key) {

        if ('value' in opt) {

            if (!skipHistory) {
                am.history.saveChain(key, [this.addKey, this, key, true], [this.addKey, this, opt, true], 'edit key');
            }

            key.value = opt.value;
        }
    }
    else {
        key = new Key(opt);
        key.value = 'value' in opt ? opt.value : this.getValue(opt.time);

        this.keyLine.addKey(key);

        if (!skipHistory) {
            am.history.closeChain(key);
            am.history.save([this.removeKey, this, opt.time, true], [this.addKey, this, opt, true], 'add key');
        }
        
        this.emit('addKey', key, this);
    }

    this._refreshInputs();
    this._refreshTgglKey();

    this.emit('change');

    return key;
};

p.removeKey = function (key, skipHistory) {

    if (!this.keyLine.removeKey(key)) {

        return;
    }

    
    if (!skipHistory) {
        am.history.save([this.addKey, this, key, true],
            [this.removeKey, this, key, true], 'remove key');
    }

    this._refreshTgglKey();

    this.emit('change');
};

p.getKey = function (time) {

    return this.keyLine.getKeyByTime(time);
};

p.getPrevKey = function (time) {

    return this.keyLine.getPrevKey(time);
};

p.getNextKey = function (time) {

    return this.keyLine.getNextKey(time);
};

p.gotoPrevKey = function (time) {

    if (time === undefined) time = this.timeline.currTime;

    var key = this.getPrevKey(time);

    if (key) {
        this.timeline.currTime = key.time;
    }
};

p.gotoNextKey = function (time) {

    if (time === undefined) time = this.timeline.currTime;

    var key = this.getNextKey(time);

    if (key) {
        this.timeline.currTime = key.time;
    }
};

p.getKeyTimes = function () {

    return this.keyLine.getKeyTimes();
};

p.toggleKey = function () {

    var key = this.getKey(this.timeline.currTime);

    if (key) {
        this.removeKey(key);
    }
    else {
        this.addKey({time: this.timeline.currTime});
    }
};

p.isValid = function () {

    return this.keyLine.keyCount !== 0;
};

p.attachInput = function (input) {

    this.detachInput(input);

    input.on('change', this._onChangeInput);
  
    this._inputs.push(input);
};

p.detachInput = function (input) {

    var idx = this._inputs.indexOf(input);

    if (idx === -1) {
        return;
    }

    input.removeListener('change', this._onChangeInput);
  
    this._inputs.splice(idx, 1);
};

p._isKeySet = function (time) {

    return !!this.getKey(time);
};








p._onChangeInput = function (value) {
    
    var oldValue = this.getValue();

    if (String(value) === String(oldValue)) {
        return;
    }
    
    this.addKey({
        time: this.timeline.currTime,
        value: value
    });

    this.emit('change');
};

p._onChangeKeyLine = function () {

    this.emit('change');
};

p._onKeyNeedsRemove = function (key) {

    this.removeKey(key);
};

p._onChangeTime = function () {

    this._refreshInputs();
    this._refreshTgglKey();
};

p._onClickTgglKey = function () {

    this.toggleKey();
};

p._onClickStepPrevKey = function () {

    this.gotoPrevKey();
};

p._onClickStepNextKey = function () {

    this.gotoNextKey();
};









p._refreshInputs = function () {

    if (this.getValue() !== undefined) {
        
        this._inputs.forEach(function (input) {

            //get the value again, because it can change over the iteration
            input.value = this.getValue();
        }, this);
    }
};

p._refreshTgglKey = function () {

    var time = this.timeline.currTime;
    
    this.optionLine.buttons.key.setHighlight(this._isKeySet(time));
    this.optionLine.buttons.key.setSteppers(!!this.getPrevKey(time), !!this.getNextKey(time));
};






p._createOptions = function (opt) {

    this.optionLine = new OptionLine(_.assign({
        keepSpaceForTgglChildren: true,
        contextMenuOptions: [
            {text: 'move up', onSelect: () => am.dialogs.WIP.show()},
            {text: 'move down', onSelect: () => am.dialogs.WIP.show()},
            {text: 'delete', onSelect: () => am.dialogs.WIP.show()},
        ],
        title: {
            text: this.name,
        },
        btnKey: {
            onClick: this._onClickTgglKey,
            onClickPrev: this._onClickStepPrevKey,
            onClickNext: this._onClickStepNextKey,
        },
        inputs: [{
            type: 'unit',
            units: [],
            name: 'input'
        }],
        indent: 0,
    }, opt));

    if (this.optionLine.inputs.input){
        
        this.attachInput(this.optionLine.inputs.input);
    }
};

p._createKeyline = function () {

    this.keyLine = new KeyLine();
    this.keyLine.on('change', this._onChangeKeyLine);
    this.keyLine.on('keyNeedsRemove', this._onKeyNeedsRemove);
};






p.dispose = function () {

    //TODO
};
