'use strict';

var amgui = require('../../../amgui');
var Input = require('./Input');
var OptionLine = require('../../../utils/OptionLine');

function ParamsTab() {

    this._paramOptionLines = [];

    this._onSelectTrack = this._onSelectTrack.bind(this);
    this._onDeselectTrack = this._onDeselectTrack.bind(this);
    this._onTrackAddParam = this._onTrackAddParam.bind(this);
    this._onChangeTime = this._onChangeTime.bind(this);
    this._onChangeParam = this._onChangeParam.bind(this);

    this._createBase();

    am.on('selectTrack', this._onSelectTrack);
    am.on('deselectTrack', this._onDeselectTrack);
    am.timeline.on('changeTime', this._onChangeTime);
}

var p = ParamsTab.prototype;





p._onSelectTrack = function (track) {

    this._unlisten();

    this._currTrack = track;

    this._listen();
};

p._onDeselectTrack = function () {

    this._unlisten();
};


p._onInputChange = function (paramName, value) {

    if (!this._currTrack) return;

    var param = this._currTrack.getParam(paramName);

    if (!param) {

        var value = input.value;
        param = this._currTrack.addParam({name: paramName});
        param.addKey({value: value});
    }
}

p._onTrackAddParam = function () {

    this._listen();
};

p._onChangeTime = function () {

    this._refreshKeyButtons();
};

p._onChangeParam = function () {

    this._refreshKeyButtons();
};






p._unlisten = function () {

    if (!this._currTrack) return;

    this._showHideNoTrackMsg(true);

    this._currTrack.removeListener('addParam', this._onTrackAddParam);

    this._forEachInput(function (input, paramName) {

        var param = this._currTrack.getParam(paramName);

        if (param) {

            param.removeListener('change', this._onChangeParam);
            param.detachInput(input);
            input.reset();
        }
    }, this);
};

p._listen = function () {

    this._currTrack.on('addParam', this._onTrackAddParam);
    
    this._showHideNoTrackMsg(false);

    this._forEachInput(function (input, paramName) {

        var param = this._currTrack.getParam(paramName);

        if (param) {

            input.value = param.getValue();
            param.attachInput(input);
            param.on('change', this._onChangeParam);
        }
    }, this);
};

p._showHideNoTrackMsg = function (show) {

    this._deMsgNoTrack.style.display = show ? 'inline-block' : 'none';
    this._deScrollCont.style.display = show ? 'none' : '';
}

p._forEachInput = function (fn, thisArg) {

    this._paramOptionLines.forEach(function (optionLine) {

        Object.keys(optionLine.inputs).forEach(function (paramName) {

            fn.call(thisArg, optionLine.inputs[paramName], paramName);
        });
    }, this);
};










p._refreshKeyButtons = function () {

    if (this._currTrack) {

        this._paramOptionLines.forEach(function (optionLine) {

            optionLine.refreshKey();
        });
    }
};







p._createBase = function () {

    var that = this;

    this.domElem = document.createElement('div');
    this.domElem.style.width = '100%';
    this.domElem.style.height = '100%';
    this.domElem.style.background = amgui.color.bg0;

    this._deMsgNoTrack = amgui.createLabel({
        parent: this.domElem,
        color: amgui.color.textInactive,
        text: am.i18n.cssModule.noTrackSelected,
    });

    this._deScrollCont = amgui.createDiv({
        display: 'none',
        width: '100%',
        parent: this.domElem,
    });

    amgui.makeScrollable({
        deCont: this.domElem,
        deTarget: this._deScrollCont
    });

    var boderStyleOptions = 'none,hidden,dotted,dashed,solid,double,groove,ridge,inset,outset,initial,inherit'.split(',');

    var paramTree = [

        {
            title: 'font',
            children: [
                {title: 'font-family', input: 'string'},
                {title: 'font-size', input: 'string'},
                {title: 'font-weight', input: 'string'},
                {title: 'font-style', input: 'string'},
                {title: 'font-variant', input: 'string'},
                {title: 'text-transform', input: 'string'},
                {title: 'text-decoration', input: 'string'},
                {title: 'color', input: 'color'},
            ],
        },
        {title: 'border', children: [
            {title: 'borderColor', children: [
                {title: 'borderTopColor', input: 'color'},
                {title: 'borderRightColor', input: 'color'},
                {title: 'borderBottomColor', input: 'color'},
                {title: 'borderLeftColor', input: 'color'},
            ]},
            {title: 'Width', children: [
                {title: 'borderTopWidth', input: {type: 'unit', units: ['px']}},
                {title: 'borderRightWidth', input: {type: 'unit', units: ['px']}},
                {title: 'borderBottomWidth', input: {type: 'unit', units: ['px']}},
                {title: 'borderLeftWidth', input: {type: 'unit', units: ['px']}},
            ]},
            {title: 'Style', children: [
                {title: 'borderTopStyle', input: {type: 'select', options: boderStyleOptions}},
                {title: 'borderRightStyle', input: {type: 'select', options: boderStyleOptions}},
                {title: 'borderBottomStyle', input: {type: 'select', options: boderStyleOptions}},
                {title: 'borderLeftStyle', input: {type: 'select', options: boderStyleOptions}},
            ]},
        ]},
        {title: 'background', children: []},
        {title: 'transform', children: [
            {title: 'translate', children: [
                {title: 'x', input: {}},
                {title: 'y', input: {}},
                {title: 'z', input: {}},
            ]},
            {title: 'scale', children: [
                {title: 'scaleX', input: {}},
                {title: 'scaleY', input: {}},
                {title: 'scaleZ', input: {}},
            ]},
            {title: 'rotation', children: [
                {title: 'rotationX', input: {}},
                {title: 'rotationY', input: {}},
                {title: 'rotationZ', input: {}},
            ]},
        ]},
        {title: 'layout', children: []},
    ];
    var build = function (nodeList, parent, indent) {

        nodeList.forEach(function (node) {

            var optionLine,
                isChildrenVisible = true;

            node.indent = indent;

            if (node.input) {

                if (typeof(node.input) === 'string') {
                    node.input = {type: node.input};
                }

                node.input.name = node.title;

                node.inputs = [node.input];
                delete node.input;
            }

            if (node.inputs) {

                node.btnKey = {
                    onClick: function () {

                        if (this._currTrack) {

                            var param = this._currTrack.addParam({
                                name: node.title,
                            });
                            param.toggleKey();
                        }
                    }.bind(this),
                };
            }

            if (node.children) {

                node.tgglChildren = {
                    onClick: onToggleChildren,
                }   
            }

            //create
            optionLine = new OptionLine(node);
            this._paramOptionLines.push(optionLine);

            //listen to inputs
            Object.keys(optionLine.inputs).forEach(function (inputName) {

                var changeHandler = this._onInputChange.bind(this, inputName);

                optionLine.inputs[inputName].on('change', changeHandler)
            }, this);


            //add param button
            var paramNames = collectParamNames(node);

            optionLine.refreshKey = function () {

                if (!optionLine.buttons.key) return;

                var hasKey = false;

                if (this._currTrack) {

                    paramNames.forEach(function (paramName) {

                        var time = am.timeline.currTime,
                            param = this._currTrack.getParam(paramName);

                        if (param && param.getKey(time)) {

                            hasKey = true;
                        }
                    }, this);
                }

                optionLine.buttons.key.setHighlight(!!hasKey);
            }.bind(this);


            //append to parent
            if (parent.addSubline) {

                parent.addSubline(optionLine.domElem);
            }
            else {
                parent.appendChild(optionLine.domElem);
            }


            if (node.children) {

                onToggleChildren();

                build(node.children, optionLine, indent + 1);
            }


            function onToggleChildren() {

                isChildrenVisible = !isChildrenVisible;

                optionLine.buttons.tgglChildren.setToggle(isChildrenVisible);

                if (isChildrenVisible) {

                    optionLine.showSubline();
                }
                else {
                    optionLine.hideSubline();
                }
            }

        }, this);

    }.bind(this);

    build(paramTree, this._deScrollCont, 0);

    function collectParamNames(node) {

        var ret = [];

        if (node.children) {

            ret = ret.concat(node.children.forEach(collectParamNames))                
        }
        else {
            ret.push(node.title);
        }

        return ret;
    }
};

module.exports = ParamsTab;
