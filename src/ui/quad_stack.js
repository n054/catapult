// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireStylesheet('ui.quad_stack');

base.require('base.bbox2');
base.require('base.quad');
base.require('base.raf');
base.require('ui.quad_view');
base.require('cc.region');
base.require('ui.camera');

base.exportTo('ui', function() {
  var QuadView = ui.QuadView;

  function validateQuads(quads) {
    for (var i = 0; i < quads.length; i++) {
      if (quads[i].stackingGroupId === undefined)
        throw new Error('All quads must have stackingGroupIds');
    }
  }

  /**
   * @constructor
   */
  var QuadStack = ui.define('quad-stack');

  QuadStack.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.viewport_ = undefined;
      this.quads_ = undefined;
      this.debug_ = false;
    },

    get layers() {
      return this.layers_;
    },

    set layers(newValue) {
      base.setPropertyAndDispatchChange(this, 'layers', newValue);
    },

    setQuadsAndViewport: function(quads, viewport) {
      validateQuads(quads);
      this.quads_ = quads;
      this.viewport = viewport;
    },

    get quads() {
      return this.quads_;
    },

    set quads(quads) {
      validateQuads(quads);
      this.quads_ = quads;
      this.updateContents_();
    },

    get viewport() {
      return this.viewport_;
    },

    set viewport(viewport) {
      this.viewport_ = viewport;

      if (this.debug) {
        this.viewport_.addEventListener('change', function() {
          this.updateDebugIndicator_();
        }.bind(this));
      }

      this.updateContents_();
    },

    get debug() {
      return this.debug_;
    },

    set debug(debug) {
      this.debug_ = debug;
      this.updateDebugIndicator_();
    },

    updateContents_: function() {

      // Build the stacks.
      var stackingGroupsById = {};
      var quads = this.quads;
      for (var i = 0; i < quads.length; i++) {
        var quad = quads[i];
        if (stackingGroupsById[quad.stackingGroupId] === undefined)
          stackingGroupsById[quad.stackingGroupId] = [];
        stackingGroupsById[quad.stackingGroupId].push(quad);
      }

      // Get rid of old quad views if needed.
      var numStackingGroups = base.dictionaryValues(stackingGroupsById).length;
      while (this.children.length > numStackingGroups) {
        var n = this.children.length - 1;
        this.removeChild(
            this.children[n]);
      }

      // Helper function to create a new quad view and track the current one.
      var that = this;
      var curQuadViewIndex = -1;
      var curQuadView = undefined;
      function appendNewQuadView() {
        curQuadViewIndex++;
        if (curQuadViewIndex < that.children.length) {
          curQuadView = that.children[curQuadViewIndex];
        } else {
          curQuadView = new QuadView();
          that.appendChild(curQuadView);
        }
        curQuadView.quads = undefined;
        curQuadView.viewport = that.viewport_;
        curQuadView.pendingQuads = [];
        curQuadView.region = new cc.Region();
        return curQuadView;
      }

      appendNewQuadView();
      for (var stackingGroupId in stackingGroupsById) {
        var stackingGroup = stackingGroupsById[stackingGroupId];
        var bbox = new base.BBox2();
        stackingGroup.forEach(function(q) { bbox.addQuad(q); });
        var bboxRect = bbox.asRect();

        if (curQuadView.region.rectIntersects(bboxRect))
          appendNewQuadView();
        curQuadView.region.rects.push(bboxRect);
        stackingGroup.forEach(function(q) {
          curQuadView.pendingQuads.push(q);
        });
      }

      var topQuadIndex = this.children.length - 1;
      var topQuad = this.children[topQuadIndex];
      topQuad.drawDeviceViewportMask = true;

      for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        child.quads = child.pendingQuads;
        delete child.pendingQuads;
      }

      this.layers = this.children;
    },

    updateDebugIndicator_: function() {
      this.indicatorCanvas_ = this.indicatorCanvas_ ||
        document.createElement('canvas');
      this.indicatorCanvas_.className = 'quad-stack-debug-indicator';
      this.appendChild(this.indicatorCanvas_);

      var resizedCanvas = this.viewport_.updateBoxSize(this.indicatorCanvas_);
      var ctx = this.indicatorCanvas_.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fontStyle = '30px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', this.indicatorCanvas_.width / 2,
          this.indicatorCanvas_.height / 2);
    }

  };

  return {
    QuadStack: QuadStack
  };
});
