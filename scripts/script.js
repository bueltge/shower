(function () {
	var url = window.location,
		body = document.body,
		slides = document.querySelectorAll('div.slide'),
		progress = document.querySelector('div.progress div'),
		slideList = [],
		l = slides.length, i;

	for (i = 0; i < l; i++) {
		slideList.push({
			id: slides[i].id,
			hasInnerNavigation: null !== slides[i].querySelector('.inner')
		});
	}

	function getTransform() {
		var denominator = Math.max(
			body.clientWidth / window.innerWidth,
			body.clientHeight / window.innerHeight
		);

		return 'scale(' + (1 / denominator) + ')';
	}

	function applyTransform(transform) {
		body.style.WebkitTransform = transform;
		body.style.MozTransform = transform;
		body.style.msTransform = transform;
		body.style.OTransform = transform;
		body.style.transform = transform;
	}

	function enterSlideMode() {
		body.className = 'full';
		applyTransform(getTransform());
	}

	function enterListMode() {
		body.className = 'list';
		applyTransform('none');
	}

	function getCurrentSlideNumber() {
		var i, l = slideList.length,
			currentSlideId = url.hash.substr(1);

		for (i = 0; i < l; ++i) {
			if (currentSlideId === slideList[i].id) {
				return i;
			}
		}

		return -1;
	}

	function scrollToCurrentSlide() {
		var currentSlide = document.getElementById(
			slideList[getCurrentSlideNumber()].id
		);

		if (null != currentSlide) {
			window.scrollTo(0, currentSlide.offsetTop);
		}
	}

	function isListMode() {
		return 'full' !== url.search.substr(1);
	}

	function normalizeSlideNumber(slideNumber) {
		if (0 > slideNumber) {
			return slideList.length - 1;
		} else if (slideList.length <= slideNumber) {
			return 0;
		} else {
			return slideNumber;
		}
	}

	function updateProgress(slideNumber) {
		if (null === progress) { return; }
		progress.style.width = (100 / (slideList.length - 1) * normalizeSlideNumber(slideNumber)).toFixed(2) + '%';
	}

	function getSlideHash(slideNumber) {
		return '#' + slideList[normalizeSlideNumber(slideNumber)].id;
	}

	function goToSlide(slideNumber) {
		url.hash = getSlideHash(slideNumber);

		if (!isListMode()) {
			updateProgress(slideNumber);
		}
	}

	function getContainingSlideId(el) {
		var node = el;
		while ('BODY' !== node.nodeName && 'HTML' !== node.nodeName) {
			if (-1 !== node.className.indexOf('slide')) {
				return node.id;
			} else {
				node = node.parentNode;
			}
		}

		return '';
	}

	function dispatchSingleSlideMode(e) {
		var slideId = getContainingSlideId(e.target);

		if ('' !== slideId && isListMode()) {
			e.preventDefault();

			// NOTE: we should update hash to get things work properly
			url.hash = '#' + slideId;
			history.replaceState(null, null, url.pathname + '?full#' + slideId);
			enterSlideMode();

			updateProgress(getCurrentSlideNumber());
		}
	}

	// Increases inner navigation by adding 'active' class to next inactive inner navigation item
	function increaseInnerNavigation(slideNumber) {
		// Shortcut for slides without inner navigation
		if (true !== slideList[slideNumber].hasInnerNavigation) { return -1; }

		var activeNodes = document.querySelectorAll(getSlideHash(slideNumber) + ' .active'),
			// NOTE: we assume there is no other elements in inner navigation
			node = activeNodes[activeNodes.length - 1].nextElementSibling;

		if (null !== node) {
			node.classList.add('active');
			return activeNodes.length + 1;
		} else {
			return -1;
		}
	}

	// Event handlers

	window.addEventListener('DOMContentLoaded', function () {
		if (!isListMode()) {
			// "?full" is present without slide hash, so we should display first slide
			if (-1 === getCurrentSlideNumber()) {
				history.replaceState(null, null, url.pathname + '?full' + getSlideHash(0));
			}

			enterSlideMode();
			updateProgress(getCurrentSlideNumber());
		}
	}, false);

	window.addEventListener('popstate', function (e) {
		if (isListMode()) {
			enterListMode();
			scrollToCurrentSlide();
		} else {
			enterSlideMode();
		}
	}, false);

	window.addEventListener('resize', function (e) {
		if (!isListMode()) {
			applyTransform(getTransform());
		}
	}, false);

	document.addEventListener('keydown', function (e) {
		// Shortcut for alt, shift and meta keys
		if (e.altKey || e.ctrlKey || e.metaKey) { return; }

		var currentSlideNumber = getCurrentSlideNumber();

		switch (e.which) {
			case 116: // F5
			case 13: // Enter
				if (isListMode()) {
					e.preventDefault();

					history.pushState(null, null, url.pathname + '?full' + getSlideHash(currentSlideNumber));
					enterSlideMode();

					updateProgress(currentSlideNumber);
				}
			break;

			case 27: // Esc
				if (!isListMode()) {
					e.preventDefault();

					history.pushState(null, null, url.pathname + getSlideHash(currentSlideNumber));
					enterListMode();
					scrollToCurrentSlide();
				}
			break;

			case 33: // PgUp
			case 38: // Up
			case 37: // Left
			case 72: // h
			case 75: // k
				e.preventDefault();

				currentSlideNumber--;
				goToSlide(currentSlideNumber);
			break;

			case 34: // PgDown
			case 40: // Down
			case 39: // Right
			case 76: // l
			case 74: // j
				e.preventDefault();

				// Only go to next slide if current slide have no inner
				// navigation or inner navigation is fully shown
				if (
					!slideList[currentSlideNumber].hasInnerNavigation ||
					-1 === increaseInnerNavigation(currentSlideNumber)
				) {
					currentSlideNumber++;
					goToSlide(currentSlideNumber);
				}
			break;

			case 36: // Home
				e.preventDefault();

				currentSlideNumber = 0;
				goToSlide(currentSlideNumber);
			break;

			case 35: // End
				e.preventDefault();

				currentSlideNumber = slideList.length - 1;
				goToSlide(currentSlideNumber);
			break;

			case 9: // Tab = +1; Shift + Tab = -1
			case 32: // Space = +1; Shift + Space = -1
				e.preventDefault();

				currentSlideNumber += e.shiftKey ? -1 : 1;
				goToSlide(currentSlideNumber);
			break;

			default:
				// Behave as usual
		}
	}, false);

	document.addEventListener('click', dispatchSingleSlideMode, false);
	document.addEventListener('touchend', dispatchSingleSlideMode, false);

	document.addEventListener('touchstart', function (e) {
		if (!isListMode()) {
			var currentSlideNumber = getCurrentSlideNumber(),
				x = e.touches[0].pageX;
			if (x > window.innerWidth / 2) {
				currentSlideNumber++;
			} else {
				currentSlideNumber--;
			}

			goToSlide(currentSlideNumber);
		}
	}, false);

	document.addEventListener('touchmove', function (e) {
		if (!isListMode()) {
			e.preventDefault();
		}
	}, false);

}());

/**
 * Prism and php#
 *
 Prism.languages.php = {
	'comment': {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|\/\/.*?(\r?\n|$))/g,
		lookbehind: true
	},
	'deliminator': /(\?>|\?&gt;|&lt;\?php|<\?php)/ig,
	'variable': /(\$\w+)\b/ig,
	'string': /("|')(\\?.)*?\1/g,
	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	},
	'keyword': /\b(and|or|xor|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|else|elseif|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|for|foreach|function|include|include_once|global|if|new|return|static|switch|use|require|require_once|var|while|abstract|interface|public|implements|extends|private|protected|throw)\b/g,
	'function': /\b(abs|acos|acosh|addcslashes|addslashes|array_change_key_case|array_chunk|array_combine|array_count_values|array_diff|array_diff_assoc|array_diff_key|array_diff_uassoc|array_diff_ukey|array_fill|array_filter|array_flip|array_intersect|array_intersect_assoc|array_intersect_key|array_intersect_uassoc|array_intersect_ukey|array_key_exists|array_keys|array_map|array_merge|array_merge_recursive|array_multisort|array_pad|array_pop|array_product|array_push|array_rand|array_reduce|array_reverse|array_search|array_shift|array_slice|array_splice|array_sum|array_udiff|array_udiff_assoc|array_udiff_uassoc|array_uintersect|array_uintersect_assoc|array_uintersect_uassoc|array_unique|array_unshift|array_values|array_walk|array_walk_recursive|atan|atan2|atanh|base64_decode|base64_encode|base_convert|basename|bcadd|bccomp|bcdiv|bcmod|bcmul|bindec|bindtextdomain|bzclose|bzcompress|bzdecompress|bzerrno|bzerror|bzerrstr|bzflush|bzopen|bzread|bzwrite|ceil|chdir|checkdate|checkdnsrr|chgrp|chmod|chop|chown|chr|chroot|chunk_split|class_exists|closedir|closelog|copy|cos|cosh|count|count_chars|date|decbin|dechex|decoct|deg2rad|delete|ebcdic2ascii|echo|empty|end|ereg|ereg_replace|eregi|eregi_replace|error_log|error_reporting|escapeshellarg|escapeshellcmd|eval|exec|exit|exp|explode|extension_loaded|feof|fflush|fgetc|fgetcsv|fgets|fgetss|file_exists|file_get_contents|file_put_contents|fileatime|filectime|filegroup|fileinode|filemtime|fileowner|fileperms|filesize|filetype|floatval|flock|floor|flush|fmod|fnmatch|fopen|fpassthru|fprintf|fputcsv|fputs|fread|fscanf|fseek|fsockopen|fstat|ftell|ftok|getallheaders|getcwd|getdate|getenv|gethostbyaddr|gethostbyname|gethostbynamel|getimagesize|getlastmod|getmxrr|getmygid|getmyinode|getmypid|getmyuid|getopt|getprotobyname|getprotobynumber|getrandmax|getrusage|getservbyname|getservbyport|gettext|gettimeofday|gettype|glob|gmdate|gmmktime|ini_alter|ini_get|ini_get_all|ini_restore|ini_set|interface_exists|intval|ip2long|is_a|is_array|is_bool|is_callable|is_dir|is_double|is_executable|is_file|is_finite|is_float|is_infinite|is_int|is_integer|is_link|is_long|is_nan|is_null|is_numeric|is_object|is_readable|is_real|is_resource|is_scalar|is_soap_fault|is_string|is_subclass_of|is_uploaded_file|is_writable|is_writeable|mkdir|mktime|nl2br|parse_ini_file|parse_str|parse_url|passthru|pathinfo|readlink|realpath|rewind|rewinddir|rmdir|round|str_ireplace|str_pad|str_repeat|str_replace|str_rot13|str_shuffle|str_split|str_word_count|strcasecmp|strchr|strcmp|strcoll|strcspn|strftime|strip_tags|stripcslashes|stripos|stripslashes|stristr|strlen|strnatcasecmp|strnatcmp|strncasecmp|strncmp|strpbrk|strpos|strptime|strrchr|strrev|strripos|strrpos|strspn|strstr|strtok|strtolower|strtotime|strtoupper|strtr|strval|substr|substr_compare)\b/g,
	'constant': /\b(__FILE__|__LINE__|__METHOD__|__FUNCTION__|__CLASS__)\b/g,
	'boolean': /\b(true|false)\b/g,
	'number': /\b-?(0x)?\d*\.?\d+\b/g,
	'operator': /[-+]{1,2}|!|=?\<|=?\>;|={1,2}(?!>)|(\&){1,2}|\|?\||\?|\*|\//g,
	'punctuation': /[{}[\];(),.:]/g
};
*/