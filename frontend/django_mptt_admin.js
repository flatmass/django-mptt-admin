/* global jQuery, gettext */

import "jqtree";
import Spinner from "spin";
import cookie from "cookie";
import urljoin from "url-join";


function initTree($tree, autoopen, autoescape, rtl, csrf_cookie_name) {
    let error_node = null;
    const insert_at_url = $tree.data("insert_at_url");

    function createLi(node, $li) {
        // Create edit link
        const $title = $li.find(".jqtree-title");

        const insert_at_url_for_node = urljoin(insert_at_url, `?insert_at=${node.id}`);

        $title.after(
            `<a href="${node.url}" class="edit" tabindex="-1">(${gettext("edit")})</a>`,
            `<a href="${insert_at_url_for_node}" class="edit" tabindex="-1">(${gettext("add")})</a>`
        );
    }

    function getCsrfToken() {
      function getFromMiddleware() {
        return document.querySelector('[name="csrfmiddlewaretoken"]').value;
      }

      function getFromCookie() {
        if (!csrf_cookie_name) {
          return null;
        }
        else {
          return cookie.parse(document.cookie)[csrf_cookie_name];
        }
      }

      return getFromCookie() || getFromMiddleware();
    }

    function handleMove(e) {
        const info = e.move_info;
        const data = {
            target_id: info.target_node.id,
            position: info.position
        };

        removeErrorMessage();

        e.preventDefault();

        jQuery.ajax({
            type: "POST",
            url: info.moved_node.move_url,
            data,
            beforeSend: xhr => {
                // Set Django csrf token
                xhr.setRequestHeader("X-CSRFToken", getCsrfToken());
            },
            success: () => {
                info.do_move();
            },
            error: () => {
                const $node = jQuery(info.moved_node.element).find(".jqtree-element");
                $node.append(`<span class="mptt-admin-error">${gettext("move failed")}</span>`);

                error_node = info.moved_node;
            }
        });

        function removeErrorMessage() {
            if (error_node) {
                jQuery(error_node.element).find(".mptt-admin-error").remove();
                error_node = null;
            }
        }
    }

    function handleLoadFailed() {
        $tree.html(gettext("Error while loading the data from the server"));
    }

    const spinners = {};

    function handleLoading(is_loading, node, $el) {
        function getNodeId() {
            if (!node) {
                return "__root__";
            }
            else {
                return node.id;
            }
        }

        function getContainer() {
            if (node) {
                return $el.find(".jqtree-element")[0];
            }
            else {
                return $el[0];
            }
        }

        const node_id = getNodeId();

        if (is_loading) {
            spinners[node_id] = new Spinner().spin(getContainer());
        }
        else {
            const spinner = spinners[node_id];

            if (spinner) {
                spinner.stop();
                spinners[node_id] = null;
            }
        }
    }

    function handleSelect(e) {
        const { node, deselected_node } = e;

        if (deselected_node) {
            // deselected node: remove tabindex
            jQuery(deselected_node.element).find(".edit").attr("tabindex", -1);
        }

        if (node) {
            // selected: add tabindex
            jQuery(node.element).find(".edit").attr("tabindex", 0);
        }
    }

    $tree.tree({
        autoOpen: autoopen,
        autoEscape: autoescape,
        buttonLeft: rtl,
        dragAndDrop: true,
        onCreateLi: createLi,
        saveState: $tree.data("save_state"),
        useContextMenu: $tree.data("use_context_menu"),
        onLoadFailed: handleLoadFailed,
        closedIcon: rtl ? "&#x25c0;" : "&#x25ba;",
        onLoading: handleLoading
    });

    $tree.on("tree.move", handleMove);
    $tree.on("tree.select", handleSelect);
}

jQuery(() => {
    const $tree = jQuery("#tree");

    if ($tree.length) {
      const autoopen = $tree.data("auto_open");
      const autoescape = $tree.data("autoescape");
      const rtl = $tree.data("rtl") === "1";
      const csrf_cookie_name = $tree.data("csrf-cookie-name");

      initTree($tree, autoopen, autoescape, rtl, csrf_cookie_name);
    }
});
