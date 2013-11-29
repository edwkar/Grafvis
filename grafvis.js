var $1 = function(selector) {
  var res = $(selector);
  console.assert(res.length == 1);
  return res;
};


var Ploth = {};

Ploth.newModel = function(opts){
  var canvas = opts.canvas;
  var ctx = canvas.getContext('2d');

  var inRange = function(x, low, high) { return low + x*(high-low); };

  var draw = function(f, xLow, xHigh, yLow, yHigh, t){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    //ctx.fillRect(0, 0, canvas.width, canvas.height);

    var isect = function(v, low, high){ return (v - low)/(high-low); };

    ctx.strokeStyle = '#aaa';

    var xis = canvas.height - inRange(isect(0, yLow, yHigh), 0, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0,            xis);
    ctx.lineTo(canvas.width, xis);
    ctx.stroke();

    var yis = inRange(isect(0, xLow, xHigh), 0, canvas.width);
    ctx.beginPath();
    ctx.moveTo(yis, 0);
    ctx.lineTo(yis, canvas.height);
    ctx.stroke();

    var numSteps = 500;
    var toDraw = [];

    for (var i = 0; i < numSteps; ++i) {
      var u = i/numSteps;

      var x = inRange(u, xLow, xHigh);
      var ys = f(x, t);

      for (var j = 0; j < ys.length; ++j) {
        if (toDraw.length <= j)
          toDraw.push([]);
        toDraw[j].push(ys[j]);
      }
    }

    for (var i = 0; i < toDraw.length; ++i) {
      ctx.strokeStyle = '#000';
      ctx.beginPath();

      for (var j = 0; j < numSteps; ++j) {
        var u = j/numSteps;
        var y = toDraw[i][j];

        var yu = (y-yLow)/(yHigh-yLow);

        var xn =                 inRange(u,  0, Number(canvas.width));
        var yn = canvas.height - inRange(yu, 0, Number(canvas.height));

        if (j == 0) ctx.moveTo(xn, yn);
        else        ctx.lineTo(xn, yn);
      }

      ctx.stroke();
    }
  };

  return {
    draw: draw
  };
};

var SEP = '$$42$$';

var encodeSetup = function(equations, axes){
  var s = equations.length + SEP;
  _.each(equations, function(eq){
    s += eq[0] + SEP + eq[1] + SEP;
  });
  s += axes.join(SEP);
  return btoa(s);
};

var decodeSetup = function(ss){
  var s = atob(ss);
  var xs = s.split(SEP);
  var T = function(){ return xs.shift(); };
  var N = function(){ return Number(T());  };

  var equations = [];
  for (var i = 0, n = N(); i < n; ++i) 
    equations.push([T(), T()]);

  var axes = [N(), N(), N(), N()];

  return { equations: equations, axes: axes };
};

var DEFAULT_Q = (
  'OCQkNDIkJHkxJCQ0MiQkLXkyJCQ0MiQkeTIkJDQyJCQ1KmNvcyh4KSAqIHNpbih4KzQqVCtyYW5kb20oKSkkJDQyJCQkJDQyJCQkJDQyJCQkJDQyJCQkJDQyJCQkJDQyJCQkJDQyJCQkJDQyJCQkJDQyJCRUJCQ0MiQkLXQvOEUyJCQ0MiQkdCQkNDIkJDAkJDQyJCQtMSQkNDIkJDEwJCQ0MiQkLTEwJCQ0MiQkMTA='
);

var WARNING = (
  'You are about to execute code specified by a third party. ' +
  'You should CANCEL if you do not fully trust the person who ' +
  'sent you to this address. ' + 
  'Are you sure you wish to continue?');

$(document).ready(function(){
  var numVars = 8;

  var canvas = $1('#canvas')[0];
  var p = Ploth.newModel({
    canvas: canvas
  });

  var qPos = document.location.href.indexOf('q=');
  var q;
  if (qPos != -1) {
    if (confirm(WARNING))
      q = document.location.href.substr(qPos+2);
    else
      return;
  } else 
    q = DEFAULT_Q;
  var setup = decodeSetup(q);

  var timeEquationEl = null;
  var equations = [];

  for (var i = 0; i < numVars; ++i) {
    var nameEl  = $('<input type="text" size="2" />');
    var eqStrEl = $('<strong>&nbsp;=&nbsp;</strong>');
    var defEl   = $('<input type="text" size="45" />');

    var ref = [nameEl, defEl];
    equations.push(ref);
    $1('#equations').append(nameEl, eqStrEl, defEl, $('<br />'));

    var isYEl = i == 0;
    var isTEl = i == numVars-1;

    if (i < setup.equations.length) {
      var n = setup.equations[i][0],
          d = setup.equations[i][1];
      nameEl.attr('value', n);
      defEl.attr('value',  d);
    }

    if (isTEl) { 
      nameEl.attr('value', 't'); 
      nameEl.attr('readonly', 'readonly');
      timeEquationEl = ref; 
    }
  }

  _.each(['xLow', 'xHigh', 'yLow', 'yHigh'], function(n, i){
    $('#'+n).val(setup.axes[i]);
  });

  var tStart = new Date();

  var update = function(){
    var t = new Date() - tStart;
    timeEquationEl[1].val(t);

    var code = '';
    _.each(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp',
            'floor', 'log', 'max', 'min', 'pow', 'random', 'round', 'sin',
            'sqrt', 'tan', 'PI', 'E', 'LOG2E', 'LOG10E', 'LN2', 'LN10',
            'SQRT2', 'SQRT1_2'], 
      function(n){ code += 'var '+n+' = Math.'+n+';' });

    code += 'var res = [];';

    for (var i = numVars-2; i >= 0; --i) {
      var n = equations[i][0].val(),
          e = equations[i][1].val()
      if ($.trim(e) !== '') {
        code += 'var ' + n + ' = ' + e + ';\n';
        if (n.indexOf('y') == 0)
          code += 'res.push(' + n + ');\n';
      }
    }
    code += 'return res;\n';

    try {
      var f = new Function(['x', 't'], code);
      var N = function(id){ return Number($1('#'+id).val()); };
      $1('#equations').removeClass('error');
      p.draw(f, N('xLow'), N('xHigh'), N('yLow'), N('yHigh'), t); 
    } catch (err) {
      $1('#equations').addClass('error');
    }
    setTimeout(update, 50);
  };

  var regenerateUrl = function(){
    var q = encodeSetup(
      _.map(equations, function(eq, i){ 
        return i == numVars-1 ? ['t', 0]
                              : [eq[0].val(), eq[1].val()] 
      }),
      _.map(['xLow', 'xHigh', 'yLow', 'yHigh'], function(n, i){
        return $('#'+n).val()
      })
    );
    $1('#url').text('http://folk.ntnu.no/edvardkk/ploth/?q=' + q);
  };

  regenerateUrl();
  $('input').keyup(regenerateUrl);

  update();
});
