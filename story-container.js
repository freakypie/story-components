/** Renders a lot of scenes */
Polymer({
  is: 'story-container',
  properties: {
    debug: {
      type: Boolean,
      value: false,
      reflectToAttribute: true
    },
    scene: {
      type: Object,
      value: null
    }
  },
  attached: function() {
    this.dispatchEvent(new CustomEvent("ready", {bubbles: true}));
    this.isReady = true;
  },
  loadJson: function(story_json) {
    this.story_json = story_json;

    if (this.story_json) {
      if (! this.story_json.scenes) {
        this.parsed = JSON.parse(this.story_json);
      } else {
        this.parsed = this.story_json;
      }
    }
    this.scenes = this.parsed.scenes;

    // TODO: create the player with an empty set of tags
    // or initialized based on the game
    this.player = this.loadPlayer();

    [].forEach.call(
      this.querySelectorAll("button"),
      function(button) {
        button.addEventListener(
          "click", this.handleChoice.bind(this));
      }.bind(this)
    );

    // get the starting scene from data
    this.firstScene = this.getSceneById(this.parsed.meta.start);

    if (this.player.choices && this.player.choices.length > 0) {
      var e = this.player.choices[this.player.choices.length - 1];
      this.renderScene(this.getSceneById(e.next_scene));
    } else {
      this.renderScene(this.firstScene);
    }
  },
  getSceneById: function(id) {
    var retval = null;
    this.scenes.forEach(function(scene) {
      if (scene.meta.id === id) {
        retval = scene;
      }
    });
    if (! retval) {
      console.error("can't find scene", id);
    }
    return retval;
  },
  defaultPlayerData: function() {
    return {choices: []};
  },
  getPlayerKey: function() {
    return "player-" + this.parsed.id;
  },
  loadPlayer: function() {
    var retval = null;
    var name = this.getPlayerKey();
    if (localStorage[name]) {
      try {
        retval = JSON.parse(localStorage[name]);
        console.log(name, retval);
      } catch(ex) {
        console.error(ex);
      }
    }
    return retval || this.defaultPlayerData();
  },
  savePlayerChoice: function(e) {
    (e.consequences || []).forEach(function(ca) {
      this.player[ca.tag] = (this.player[ca.tag] || 0) + ca.value;
    }.bind(this));
    if (! this.player.choices) {
      this.player.choices = [];
    }
    this.player.choices.push(e);
    this.savePlayer();
  },
  savePlayer: function() {
    var name = this.getPlayerKey();
    localStorage[name] = JSON.stringify(this.player);
  },
  revertPlayerChoice: function() {
    var new_player = {choices: this.player.choices};
    if (new_player.choices.length) {
      new_player.choices.pop();

      this.player.choices.forEach(function(choice) {
        choice.consequences.forEach(function(ca) {
          new_player[ca.tag] = (new_player[ca.tag] || 0) + ca.value;
        });
      });
    }
    this.player = new_player;
    this.savePlayer();
  },
  comparisonsInverted: {
    "=": function(a, b) {
      return a != b;
    },
    ">=": function(a, b) {
      return a < b;
    },
    "<=": function(a, b) {
      return a > b;
    },
    ">": function(a, b) {
      return a <= b;
    },
    "<": function(a, b) {
      return a >= b;
    },
  },
  renderTags: function(tags, labelType) {
    var taglist = [];
    var comp = ": ";
    if (! labelType) {
      labelType = "info";
    }
    tags.forEach(function(tag) {
      comp = tag.comparison || ": ";
      taglist.push(
        "<span class='label label-" + labelType + "'>" +
        tag.tag + comp + tag.value + "</span>");
    });
    return taglist.join(" ");
  },
  renderScene: function(scene) {
    var contentArea = this.$$(".story-content");
    var choiceArea = this.$$(".choices");

    // save for future reference
    this.scene = scene;

    if (this.debug) {
      this.querySelector(".status-bar").style.display = "block";
      this.querySelector("#scene-name").innerHTML = scene.meta.name;
    } else {
      this.querySelector(".status-bar").style.display = "none";
    }

    var promises = []
    Array.prototype.forEach.call(contentArea.querySelectorAll("story-scene"), function(old) {
      if (old) {
        promises.push(old.destroy());
      }
    });

    Promise.all(promises).then(function() {

      var content = null;
      var valid = false;

      content = document.createElement("story-scene");
      content.player = this.player;
      content.debug = this.debug;
      content.loadJson(scene);
      contentArea.appendChild(content);

      // listen for choices
      this.listen(content, "choice", "handleChoice");

      // allow another choice to be clicked
      setTimeout(function() {
        this.handlingChoice = false;
      }.bind(this), 1);

    }.bind(this));
  },
  handleChoice: function(e) {
    if (! this.handlingChoice) {
      this.handlingChoice = true;
      var id = null;
      var scene = null;

      if ("next_scene" in e.detail) {
        id = e.detail.next_scene || "finish";
        if (id !== "finish") {
          this.savePlayerChoice(e.detail);
        }
      } else {
        id = e.target.value;
      }

      // check for finish
      if (id == "finish") {
        var event = new CustomEvent(
          "story:finished",
          {bubbles: true, cancelable: true}
        );
        this.dispatchEvent(event);
        id = null;

      // check for back
      } else if (id == "back") {
        this.revertPlayerChoice();
        if (this.player.choices.length > 0) {
          id = this.player.choices[this.player.choices.length - 1].next_scene;
        } else {
          id = this.firstScene.meta.id;
        }

      // check for reset
      } else if (id == "restart" || id == "reset" || ! id) {
        this.player = this.defaultPlayerData();
        this.savePlayer();
        id = this.firstScene.meta.id;
      }

      // find the correct scene
      if (id) {
        this.loadSceneById(id);
      }
    }
  },
  restart: function() {
    this.player = this.defaultPlayerData();
    this.savePlayer();

    // destroy old scenes
    this.$$(".story-content").innerHTML = "";

    // reload
    var id = this.firstScene.meta.id;
    this.loadSceneById(id);
  },
  loadSceneById: function(id) {
    var scene = this.getSceneById(id);
    if (scene.meta.id === id) {
      this.renderScene(scene);
    } else {
      console.error("Can't find scene", e.target, id);
    }
  }
});
