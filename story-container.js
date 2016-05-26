/** Renders a lot of scenes */
Polymer({
  is: 'story-container',
  properties: {
    debug: {
      type: "boolean",
      value: false
    },
    scene: {
      type: "object",
      value: null
    }
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

    if (this.player.choices.length > 0) {
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
    return retval;
  },
  defaultPlayerData: function() {
    return {choices: []};
  },
  getPlayerKey: function() {
    return "player-" + this.parsed.meta.id;
  },
  loadPlayer: function() {
    var retval = null;
    var name = this.getPlayerKey();
    if (localStorage[name]) {
      try {
        retval = JSON.parse(localStorage[name]);
      } catch(ex) {
        console.error(ex);
      }
    }
    return retval || this.defaultPlayerData();
  },
  savePlayerChoice: function(e) {
    for(var ca of e.consequences) {
      this.player[ca.tag] = (this.player[ca.tag] || 0) + ca.value;
    }
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

      for(var choice of this.player.choices) {
        for (var ca of choice.consequences) {
          new_player[ca.tag] = (new_player[ca.tag] || 0) + ca.value;
        }
      }
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
    for(var tag of tags) {
      comp = tag.comparison || ": ";
      taglist.push(
        "<span class='label label-" + labelType + "'>" +
        tag.tag + comp + tag.value + "</span>");
    }
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

    Array.prototype.forEach.call(contentArea.querySelectorAll("story-scene"), function(old) {
      if (old) {
        old.destroy();
      }
    });

    var content = null;
    var valid = false;

    content = document.createElement("story-scene");
    content.player = this.player;
    content.debug = this.debug;
    content.loadJson(scene);
    contentArea.appendChild(content);

    // TODO: put this in scene
    // for (var c of scene.content) {
    //   var valid = this.playerHas(c.tags);
    //   if (valid || this.debug) {
    //     // contentParent = document.createElement("div");
    //     // contentParent.appendChild(content);
    //     if (! valid) {
    //         content.classList.add("muted");
    //     }
    //     // Polymer.dom(content).innerHTML = this.renderTags(c.tags, "warning") + " " + c.text;
    //   }
    // }

    // listen for choices
    this.listen(content, "choice", "handleChoice");
  },
  handleChoice: function(e) {
    var id = null;
    var scene = null;

    if (e.detail.next_scene) {
      id = e.detail.next_scene;
      this.savePlayerChoice(e.detail);
    } else {
      id = e.target.value;
    }

    // check for back
    if (id == "back") {
      this.revertPlayerChoice();
      if (this.player.choices.length > 0) {
        id = this.player.choices[this.player.choices.length - 1].next_scene;
      } else {
        id = this.firstScene.meta.id;
      }

    // check for reset
    } else if (id == "restart" || id == "reset") {
      this.player = this.defaultPlayerData();
      this.savePlayer();
      id = this.firstScene.meta.id;
    }

    // find the correct scene
    this.loadSceneById(id);
  },
  restart: function() {
    this.player = this.defaultPlayerData();
    this.savePlayer();
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
