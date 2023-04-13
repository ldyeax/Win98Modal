const RESTORED = 1;
const MINIMIZED = 2;
const MAXIMIZED = 3;
const CLOSED = 4;

const TYPE_IMAGE = "image";
const TYPE_IFRAME = "iframe";
const TYPE_HTML = "html";
const TYPE_NODE = "node";
const TYPE_NONE = "none";

const DEFAULT_ARGS = {
	title: "Example",
	question: false,
	type: TYPE_IMAGE,
	contents: "https://picsum.photos/id/237/536/354",
	width: 256,
	x: 32,
	y: 32,
	icon: "",
	iconType: TYPE_IMAGE,
	iconPixelated: true,
	resizable: true,
	href: "",
	hrefNewWindow: true
};

// const MINIMIZE = "🗕";
// const RESTORE = "🗗";
// const MAXIMIZE = "🗖";
// const CLOSE = "🗙";

const template = `
<div class=win98modal style='position: absolute; display: flex; flex-direction: column; flex-align: flex-start; top: 0; left: 0; border: 4px outset #BDBDBD;'>
	<div class=titlebar style="
		display: flex; 
		flex-direction: row; 
		flex-align: flex-start; 
		background: linear-gradient(90deg, rgba(0,239,255,1) 0%, rgba(237,0,255,1) 100%);
		padding: 2px;
		height: 20px;
		cursor: move;
		">
		<div class=icon></div>
		<div class=title style="
			flex-grow: 1; 
			padding-left: 4px; 
			color: white;
			white-space: nowrap;
			overflow: hidden;
		">Title</div>
		<div class=buttons style="align-self: flex-end; display: flex; align-items: center;">
			<button class=question>?</button>
			<button class=minimize>🗕</button>
			<button class=maximize>🗖</button>
			<button class=restore style="display: none;">🗗</button>
			<button class=close>🗙</button>
		</div>
	</div>
	<div class=contents>
	</div>
</div>
`;

const css = `
.win98modal .buttons button {
	background-color: #BDBDBD;
	height: 20px;
	width: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	padding-bottom: 4px;
}
`;
const styleElement = document.head.appendChild(document.createElement("style"));
styleElement.innerHTML = css;

class Vector2 {
	x = 0;
	y = 0;
	static ZERO = new Vector2(0, 0);
	constructor(x, y) {
		if (typeof x !== "undefined") {
			this.x = x;
			this.y = y;
		}
	}
	clone() {
		return new Vector2(this.x, this.y);
	}
}

export default class Win98Modal {
	#state = RESTORED;
	#args = {};

	// #region position and dragging
	#position = new Vector2();
	#resizable = true;
	/**
	 * Bounding rect of whole modal
	 * @returns {DOMRect}
	 */
	getRect() {
		return this.#win98Modal.getBoundingClientRect();
	}
	getTitleBarRect() {
		return this.#win98Modal.querySelector(".titlebar").getBoundingClientRect();
	}
	/**
	 * Calculated position - will not be offscreen and will be 0,0 if maximized
	 * @returns {Vector2}
	 */
	getPosition() {
		if (this.#state === MAXIMIZED) {
			return Vector2.ZERO;
		}
		let rect = this.getRect();
		if (rect.right < 0) {
			this.#position.x = 0;
		}
		if (rect.left > window.innerWidth) {
			this.#position.x = window.innerWidth - rect.width;
		}
		if (rect.top < 0) {
			this.#position.y = 0;
		}
		if (rect.top > window.innerHeight) {
			this.#position.y = window.innerHeight - rect.height;
		}
		return this.#position;
	}
	setPosition(x, y) {
		this.#position.x = x;
		this.#position.y = y;
		this.refresh();
	}
	#setPositionDragging(x, y) {
		this.#position.x = this.#startDragModalPosition.x + x - this.#startDragCursorPosition.x;
		this.#position.y = this.#startDragModalPosition.y + y - this.#startDragCursorPosition.y;
		this.refresh();
	}
	#startDrag(clientX, clientY) {
		this.#startDragCursorPosition = new Vector2(clientX, clientY);
		this.#startDragModalPosition = this.#position.clone();
		this.#dragging = true;
		this.#contents.style.pointerEvents = "none";
	}
	#startDragCursorPosition = null;
	#startDragModalPosition = null;
	#dragging = false;
	#endDrag() {
		this.#dragging = false;
		this.#contents.style.pointerEvents = "auto";
	}
	// #endregion

	// #region public button methods
	close() {
		this.#state = CLOSED;
		this.refresh();
	}
	minimize() {
		this.#state = MINIMIZED;
		this.refresh();
	}
	maximize() {
		this.#state = MAXIMIZED;
		this.refresh();
	}
	restore() {
		this.#state = RESTORED;
		this.refresh();
	}
	// #endregion

	// #region focus
	static #zIndexCounter = 100;
	focus() {
		this.#win98Modal.style.zIndex = Win98Modal.#zIndexCounter++;
	}
	// #endregion

	// #region button visibility
	#showMazimizeButton() {
		this.#win98Modal.querySelector(".maximize").style.display = "";
		this.#win98Modal.querySelector(".restore").style.display = "none";
	}
	#showRestoreButton() {
		this.#win98Modal.querySelector(".maximize").style.display = "none";
		this.#win98Modal.querySelector(".restore").style.display = "";
	}
	#disableMinimizeButton() {
		this.#win98Modal.querySelector(".minimize").disabled = true;
	}
	#enableMinimizeButton() {
		this.#win98Modal.querySelector(".minimize").disabled = false;
	}
	#disableMaximizeButton() {
		this.#win98Modal.querySelector(".maximize").disabled = true;
	}
	#enableMaximizeButton() {
		this.#win98Modal.querySelector(".maximize").disabled = false;
	}
	#disableRestoreButton() {
		this.#win98Modal.querySelector(".restore").disabled = true;
	}
	#enableRestoreButton() {
		this.#win98Modal.querySelector(".restore").disabled = false;
	}
	// #endregion

	refresh() {
		let args = this.#args;

		let position = this.getPosition();
		this.#win98Modal.style.left = position.x + "px";
		this.#win98Modal.style.top = position.y + "px";

		let questionButton = this.#win98Modal.querySelector(".question");
		if (!args.question) {
			questionButton.style.display = "none";
		} else {
			questionButton.style.display = "";
		}

		switch (this.#state) {
			case RESTORED:
				this.#win98Modal.style.display = "flex";
				this.#win98Modal.style.width = args.width + "px";
				this.#contents.style.height = args.height + "px";
				this.#contents.style.display = "";
				this.#showMazimizeButton();
				this.#enableMinimizeButton();
				break;
			case MINIMIZED:
				this.#win98Modal.style.display = "flex";
				this.#win98Modal.style.width = args.width + "px";
				this.#contents.style.display = "none";
				this.#showRestoreButton();
				this.#disableMinimizeButton();
				break;
			case MAXIMIZED:
				this.#win98Modal.style.display = "flex";
				this.#win98Modal.style.width = window.innerWidth - 8 + "px";
				this.#contents.style.height = window.innerHeight - this.getTitleBarRect().height - 8 + "px";
				this.#contents.style.display = "";
				this.#showRestoreButton();
				this.#enableMinimizeButton();
				break;
			case CLOSED:
				this.#win98Modal.style.display = "none";
				break;
		}

		if (!this.#resizable) {
			this.#disableMaximizeButton();
		} else {
			this.#enableMaximizeButton();
		}

		if (this.#args.iconPixelated) {
			this.#win98Modal.querySelector(".icon").style.imageRendering = "pixelated";
		}
	}

	setTitle(text) {
		if (typeof text != "string") {
			text = JSON.stringify(text);
		}
		this.#nodeContainer.querySelector(".title").innerText = text;
		this.#nodeContainer.querySelector(".title").title = text;
	}

	#contents = null;
	/**
	 * @type {HTMLDivElement}
	 */
	#nodeContainer = null;
	/**
	 * @type {HTMLDivElement}
	 */
	#win98Modal = null;

	constructor(args) {
		args = this.#args = Object.assign({}, DEFAULT_ARGS, args);

		let nodeContainer = this.#nodeContainer = document.body.appendChild(document.createElement("div"));
		nodeContainer.style.position = "absolute";
		nodeContainer.style.top = "0";
		nodeContainer.style.left = "0";

		nodeContainer.innerHTML = template;

		let win98modal = this.#win98Modal = nodeContainer.querySelector(".win98modal");
		let contents = this.#contents = nodeContainer.querySelector(".contents");

		let contentsContainer = contents;
		if (args.href) {
			contentsContainer = contents.appendChild(document.createElement("a"));
			contentsContainer.href = args.href;
			if (args.hrefNewWindow) {
				contentsContainer.target = "_blank";
			}
		}

		// #region set up icon
		let iconContainer = nodeContainer.querySelector(".icon");
		switch (args.iconType) {
			case TYPE_IMAGE:
				let img = iconContainer.appendChild(document.createElement("img"));
				img.src = args.icon;
				img.height = 20;
				break;
			case TYPE_NONE:
				iconContainer.style.display = "none";
				break;
			default:
				throw new Error(`Icon type not implemeted: ${args.iconType}`);
		}
		// #endregion

		// #region set up body
		switch (args.type) {
			case TYPE_IMAGE:
				let img = contentsContainer.appendChild(document.createElement("img"));
				img.src = args.contents;
				if (args.imageWidth) {
					img.width = args.imageWidth;
				}
				if (args.imageHeight) {
					img.height = args.imageHeight;
				}
				break;
			case TYPE_IFRAME:
				let iframe = contentsContainer.appendChild(document.createElement("iframe"));
				iframe.src = args.contents;
				iframe.style.width = "100%";
				iframe.style.height = "100%";
				iframe.style.border = "none";
				break;
			case TYPE_HTML:
				let div = contentsContainer.appendChild(document.createElement("div"));
				div.innerHTML = args.contents;
				break;
			case TYPE_NODE:
				contentsContainer.appendChild(args.contents);
				break;
		}
		// #endregion

		// #region drag listeners
		let titlebar = win98modal.querySelector(".titlebar");
		window.addEventListener("mousedown", (e) => {
			let target = e.target;
			let found = false;
			let foundModal = false;
			while (target) {
				if (target == titlebar) {
					found = true;
					foundModal = true;
					break;
				}
				if (target == win98modal) {
					foundModal = true;
				}
				target = target.parentElement;
			}
			if (found) {
				this.#startDrag(e.clientX, e.clientY);
			}
			if (foundModal) {
				this.focus();
			}
		});
		window.addEventListener("mouseup", (e) => {
			this.#endDrag();
		});
		window.addEventListener("mousemove", (e) => {
			if (this.#dragging) {
				this.#setPositionDragging(e.clientX, e.clientY);
			}
		});
		// #endregion

		this.setPosition(args.x, args.y);

		// #region button click listeners
		win98modal.querySelector(".buttons .close").addEventListener("click", () => {
			this.close();
		});
		win98modal.querySelector(".buttons .minimize").addEventListener("click", () => {
			this.minimize();
		});
		win98modal.querySelector(".buttons .maximize").addEventListener("click", () => {
			this.maximize();
		});
		win98modal.querySelector(".buttons .restore").addEventListener("click", () => {
			this.restore();
		});
		// #endregion

		// #region window resize listener
		window.addEventListener("resize", () => {
			this.refresh();
		});
		// #endregion

		this.setTitle(args.title);

		this.#resizable = args.resizable;

		this.refresh();
	}
}
