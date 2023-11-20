// This document is structured as follows:
// 1. Global Variables
// 2. Server Functions
// 4. Startup Functions
// 5. UI Functions
// 6. Download Functions

//////////////////////////
// 1. Global Variables
//////////////////////////

// API Paths
const url = "http://localhost/api/v1/license";
const restrictionPath = '/restriction/';
const domainPath = '/domain/';
const sourcePath = '/source/';
// const preamblePath = './assets/';

//Specify the Mandatory Use Restrictions source using the lock variable
// Here, 5 is the ID for the source "RAIL (IEEE)"
const lock = 5;

// Variables for final License construction, default is OpenRAIL 
let selectedLicenseType = 'OpenRAIL';
let specification = { length: 0, data: false, application: false, model: false, sourcecode: false };
let permissions = {derivatives: true, researchOnly: false};
let artefact_s = '';
let rawPreamble = '';
let injectReadyPreamble = '';
let specifiedDomains = [];
let licenseLog = {};

// Variables for UI Events
let agreed = false;
let named = false;
let picked = false;

//////////////////////////
// 2. Server Functions
//////////////////////////

async function backendAvailable() {
	try {
		let response = await fetch(url, {
			mode: 'cors'
		});

		return response;
	} catch (error){
		console.log(error.message);
	}
}

async function getData() {
	try {
		let restrictionFetch = await fetch(url + restrictionPath, {
		    method: 'GET',
			mode: 'cors',
		    headers: {
        		'Content-Type': 'application/json',
			},
		});
		let domainFetch = await fetch(url + domainPath, {
		    method: 'GET',
			mode: 'cors',
		    headers: {
        		'Content-Type': 'application/json',
			},
		});
		let sourceFetch = await fetch(url + sourcePath, {
		    method: 'GET',
			mode: 'cors',
		    headers: {
        		'Content-Type': 'application/json',
			},
		});

		let restrictions = await restrictionFetch.json();
		let domains = await domainFetch.json();
		let sources = await sourceFetch.json();

		processResponse(restrictions, domains, sources);
	} catch (error){
		console.log(error.message);
	}
}

async function postLicense() {

	document.getElementById('previewTooltip').style.display = "none";

	const timestamp = new Date();

	let additionalRestrictionsList = document.getElementById('additional-restrictions');
	let specificationString = '';

	if(Object.values(specification).includes(true)) {
		let specificationParent = document.getElementById('specificationParent');

		for(let i = 1; i < specificationParent.children.length; i++) {
			if(specificationParent.children[i].style.display === "inline") {
				specificationString += specificationParent.children[i].innerText;
			}
		}

		console.log(specificationString);
	}

	// add Name
	licenseLog = {
		"timestamp": timestamp.toISOString(),
		// "name": artefact_s.toString(),
		"artifact": specificationString.toString(),
		"license": selectedLicenseType.toString(),
		"data": specification.data,
		"application": specification.application,
		"model": specification.model,
		"sourcecode": specification.sourcecode,
		"derivatives": permissions.derivatives,
		"researchOnly": permissions.researchOnly,
		"specifiedDomain_ids": [],
		"additionalRestriction_ids": []
	}

	if(additionalRestrictionsList.children.length > 0) {
		let addRes = [];
		let tempDom = [];
		for(let child of additionalRestrictionsList.children) {
			addRes.push(child.dataset.id);
			tempDom.push(child.dataset.domain_id);
		}
		licenseLog.additionalRestriction_ids = addRes;

		let addDom = [... new Set(tempDom)];
		licenseLog.specifiedDomain_ids = addDom;
	}

	// console.log(specifiedDomains);
	console.log(JSON.stringify(licenseLog));

	try {
		let response = await fetch(url, {
			method: 'POST',
			mode: 'cors',
		    headers: {
        		'Content-Type': 'application/json',
			},
      		body: JSON.stringify(licenseLog)
		});
		let license = await response.json();
		console.log(license);
		// if(response.ok) {
		// 	const license = await response.json().then((json) => {
		// 		console.log(json);
		// 	});
		// }
	} catch (error){
		console.log(error + " " + error.message);
	}
}


//////////////////////////
// 3. Startup Functions
//////////////////////////

function isLocalhost(url) {
	return url.includes('localhost') || url.includes('127.0.0.1');
}


function init(el) {
	console.log('Initializing');
	getData();
	M.AutoInit();
}

window.addEventListener("load", (event) => {
	if (window.location.protocol == 'http:' && !isLocalhost(window.location.href)) {          

		console.log("https forced");
		window.location.href = window.location.href.replace('http:', 'https:');

	} else if (window.location.protocol == "https:" || isLocalhost(window.location.href)) {
		backendAvailable().then((response) => {
			if(response.status == '200') {
			    var elems = document.querySelectorAll('.modal');
			    let options = {
			    	onCloseEnd: init(this),
			    	dismissible: false
			    };
			    var instances = M.Modal.init(elems, options);
			    instances[0].open();
			}
		});
	}
});

function processResponse(r, d, s) {
	let lockedRestrictions = document.getElementById('locked-restrictions');

	console.log(d);

	//Add domains as options to select element
	for (let child of d) {
		let option = document.createElement('option');
		option.value = child.name.toString();
		option.innerHTML = child.name.toString();

		additionalRestrictions.appendChild(option);
	}

	M.FormSelect.init(additionalRestrictions);

	//Add Restrictions
	for (let child of r) {
		if(child.source_id === lock) {
			let lockedRestriction = document.createElement("li");
			lockedRestriction.innerHTML = child.text.toString();

			lockedRestrictions.appendChild(lockedRestriction);
		} else {
			let additionalRestriction = document.createElement('p');
		 	additionalRestriction.classList.add(d[child.domain_id-1].name.toString());

		 	let label = document.createElement('label');
		 	let span = document.createElement('span');
		 	span.innerHTML = child.text.toString();

		 	let chip1 = document.createElement('div');
		 	chip1.classList.add('chip');
		 	chip1.innerHTML = s[child.source_id-1].name.toString();
		 	span.appendChild(chip1);


		 	let chip2 = document.createElement('div');
		 	chip2.classList.add('chip');
		 	chip2.classList.add('domain');
		 	chip2.innerHTML = d[child.domain_id-1].name.toString();
		 	span.appendChild(chip2);

		 	label.appendChild(span);

		 	let input = document.createElement('input');
		 	input.type = 'checkbox';
		 	input.dataset.domain = d[child.domain_id-1].name.toString();
		 	input.dataset.domain_id = d[child.domain_id-1].id;
		 	input.dataset.id = child.id;
		 	input.dataset.restriction = child.text.toString();
		 	input.onclick = function(event) {
				event.stopImmediatePropagation();
				processRestriction(this);
			};

			label.insertBefore(input, label.firstChild);
		 	additionalRestriction.appendChild(label);

			additionalRestriction.style.display = 'none';

			document.getElementById('domainChoice').appendChild(additionalRestriction);
		}
	}
}

//////////////////////////
// 4. UI Functions
//////////////////////////


function processDomain(el) {
	let domains = document.getElementById('domainChoice');

	for(let restriction of domains.children) {
		if(restriction.className == el.value) {
			restriction.style.display = "block";
		} else {
			restriction.style.display = "none";
		}
	}
}

function processRestriction(el) {
	let additionalRestrictionsBlock = document.getElementById('additionalRestrictionsPreview');
	let additionalRestrictionsList = document.getElementById('additional-restrictions');
	let banner = document.getElementById('banner');
	let bannerArray;

	if(el.checked && additionalRestrictionsList.children.length === 0) {
		console.log("Add first child");
		additionalRestrictionsBlock.style.display = "flex";
		additionalRestrictionsBlock.classList.add('showPreview');

		let newRestriction = document.createElement('li');
		newRestriction.dataset.id = el.dataset.id;
		newRestriction.dataset.domain = el.dataset.domain;
		newRestriction.dataset.domain_id = el.dataset.domain_id;
		newRestriction.innerHTML = el.dataset.restriction.toString();
		additionalRestrictionsList.appendChild(newRestriction);

	   let div = document.createElement('div');
	   div.id = el.dataset.domain.toString();
	   div.classList.add('banner-img');
	   let img = document.createElement('img');
	   img.src = './assets/' + el.dataset.domain + '.png';
	   div.appendChild(img);
	   banner.appendChild(div);

	   specifiedDomains.push(el.dataset.domain);

	} else if (el.checked && additionalRestrictionsList.children.length >= 1) {
		console.log("Add another child");
		let newRestriction = document.createElement('li');
		newRestriction.dataset.id = el.dataset.id;
		newRestriction.dataset.domain = el.dataset.domain;
		newRestriction.dataset.domain_id = el.dataset.domain_id;
		newRestriction.innerHTML = el.dataset.restriction.toString();
		additionalRestrictionsList.appendChild(newRestriction);

		
		if(!specifiedDomains.includes(el.dataset.domain)) {
			console.log("Add icon")
			let div = document.createElement('div');
			div.id = el.dataset.domain.toString();
			div.classList.add('banner-img');
			let img = document.createElement('img');
			img.src = './assets/' + el.dataset.domain + '.png';
			div.appendChild(img);
			banner.appendChild(div);

			specifiedDomains.push(el.dataset.domain);
		}
		
	} else if (!el.checked && additionalRestrictionsList.children.length >= 1) {
		for(let child of additionalRestrictionsList.children) {
			if(el.dataset.id === child.dataset.id) {
				console.log("Remove child");
				additionalRestrictionsList.removeChild(child);

				if(additionalRestrictionsList.children.length === 0) {
					additionalRestrictionsBlock.style.display = "none";
				}
			} else {
				continue;
			}
		}

		handleIcons(additionalRestrictionsList.children, el.dataset.domain);
	}
}

function handleIcons(arr, check) {
	let currentDomains = [];

	for(let item of arr) {
		currentDomains.push(item.dataset.domain);
	}

	let index = specifiedDomains.indexOf(check);

	if(!currentDomains.includes(specifiedDomains[index])) {
		specifiedDomains.splice(index, 1);
		console.log("Remove icon");
		let childToRemove = document.getElementById(check);
		banner.removeChild(childToRemove);
	}
}

function checkModal(el) {
	let input = document.getElementById('artefacts_inline').value;
	
	if(el.children[0].classList.contains('disabled') && (!named || input.length <= 1)) {
		M.toast({html: 'Provide a name to proceed!'});
	}
}

function processLicenseChoice(el) {
	document.getElementById("license-type").innerHTML = el.dataset.license.toString();
	selectedLicenseType = el.dataset.license.toString();

	let cards = document.getElementsByClassName('card');
	let cardsContent = document.getElementsByClassName('card-content');

	for(let i = 0; i < cards.length; i++) {
		if(i == el.dataset.index) {
			cards[i].classList.remove('lighten-2');
			cards[i].classList.add('lighten-5');
			cardsContent[i].dataset.active = true;
		} else {
			cards[i].classList.remove('lighten-5');
			cards[i].classList.add('lighten-2');
			cardsContent[i].dataset.active = false;
		}
	}

	checkCondition(el.dataset.index);

	picked = true;
}

function processNaming(el) {
	if(el.toString().length > 0) {
		document.getElementById('artefact_title').innerHTML = el.toString();
		named = true;
		artefact_s = el.toString();
		if(named) {
			document.getElementById('modal-agree').classList.remove('disabled'); 
		}
	}
}

function processSpecification(el) {
	let specificationParent = document.getElementById('specificationParent');

	if(el.checked) {
		if(specification.length === 0) {
			console.log("Add first specification");
			specificationParent.children[0].style.display = "inline";
			specificationParent.children[el.dataset.order].style.display = "inline";
			specification.length = 1;
			specification[el.dataset.specification] = true;
		} else if (specification.length >= 1) {
			specificationParent.children[el.dataset.order].style.display = "inline";
			specification[el.dataset.specification] = true;
			specification.length++;
		}
	} else if (!el.checked) {
		console.log("Remove specification");
		specificationParent.children[el.dataset.order].style.display = "none";
		specification.length--;
		specification[el.dataset.specification] = false;

		if(specification.length === 0) {
			specificationParent.children[0].style.display = "none";
			specification.length = 0;
		}
	}
}

function processPermission(el) {
	let permission = document.getElementById(el.dataset.permission.toString());
	document.getElementById("license-type").innerHTML = el.dataset.license.toString();

	if(el.checked) {
		permission.innerHTML = el.dataset.copy.toString() + "&#10003;";
		permissions[el.dataset.permission] = true;
	} else if (!el.checked) {
		permission.innerHTML = '';
		permissions[el.dataset.permission] = false;
	}

	checkCondition(el.dataset.index);
}

function checkCondition(i) {
	let conditionSwitches = Array.prototype.slice.call(document.getElementsByClassName("condition"));
	let licenseCards = Array.prototype.slice.call(document.getElementsByClassName("card-content"));
	let conditionArray = conditionSwitches.concat(licenseCards);

	for(let item of conditionArray) {
		if(item.dataset.index === i) {
			if(item.nodeName === "INPUT") {
				document.getElementById(item.dataset.permission.toString()).innerHTML = item.dataset.copy.toString() + " &#10003;";
				permissions[item.dataset.permission] = true;
				item.checked = true;
			} else if (item.nodeName === "DIV") {
				item.parentElement.classList.remove('lighten-2');
				item.parentElement.classList.add('lighten-5');
				selectedLicenseType = item.dataset.license.toString();
			}
		} else {
			if(item.nodeName === "INPUT") {
				item.checked = false;
				document.getElementById(item.dataset.permission.toString()).innerHTML = '';
				permissions[item.dataset.permission] = false;
			} else if (item.nodeName === "DIV") {
				item.parentElement.classList.remove('lighten-5');
				item.parentElement.classList.add('lighten-2');
			}
		}
	}
}

function showPage(el){
	let pages = document.getElementById('pages');
	let pagination = document.getElementById('paginationLinks').children;
	let progress = document.getElementById('progressBar');
	let indicator = document.getElementById('indicator');
	let active = el.dataset.link;

	progress.style.width = el.dataset.progress + "%";

	for (let child of pages.children) {
		if(child.id != active.toString()) {
			child.style.display = 'none';
		} else {
			console.log(child.id + " is active.")
			child.style.display = 'block';
			if(child.id === "finish") {
				indicator.style.visibility = "hidden";
				postLicense();
			} else {
				indicator.style.visibility = "visible";
			}
		}
	}

	for(let child of pagination) {
		if(child === el.parentElement) {
			child.classList.add('active');
		} else {
			child.classList.remove('active');
		}
	}
}

//////////////////////////
// 5. Download Functions
//////////////////////////

function buildLicense(format) {
	document.getElementById('previewTooltip').style.display = "none";

	const timestamp = new Date();

	let additionalRestrictionsList = document.getElementById('additional-restrictions');
	let specificationParent = document.getElementById('specificationParent');

	licenseLog = {
		"timestamp": timestamp.toISOString(),
		// "name": artefact_s.toString(),
		"license": selectedLicenseType.toString(),
		"artifact": artefact_s.toString(),
		"data": specification.data,
		"application": specification.application,
		"model": specification.model,
		"sourcecode": specification.sourcecode,
		"derivatives": permissions.derivatives,
		"researchOnly": permissions.researchOnly
	}

	console.log(specifiedDomains);

	// rawPreamble = 

	// if(specifiedDomains.length > 0) {
	// 	let addDom = {};
	// 	for(let child of specifiedDomains.children) {
	// 		addDom.push(child.toString());
	// 	}
	// 	licenseLog.specifiedDomains = addDom;
	// }

	if(additionalRestrictionsList.children.length > 0) {
		let addRes = {};
		for(let child of additionalRestrictionsList.children) {
			addRes.push(child.dataset.id);
		}
		licenseLog.additionalRestrictions = addRes;
	}

	if(Object.values(specification).includes(true)) {
		for(let key of Object.entries(specification)) {
			if(key[1] === true) {
				let specificationTags = injectReadyPreamble.getElementsByClassName(key[0]);
				
				for (let child of specificationTags) {
					child.style.display = "inline";
				}
			} else if (key[1] === false) {
				let specificationTags = injectReadyPreamble.getElementsByClassName(key[0]);

				for (let child of specificationTags) {
					child.parentNode.removeChild(child);
				}	
			}
		}
	}

	// if(licenseLog[permissions].includes(true)) {
	// 	console.log("search for permissions");
	// }

	let preamble = document.getElementById('preamble');
	preamble.appendChild(injectReadyPreamble);
}


//add preamble injection
function downloadPDF() {
	let el = document.getElementById('preview');
	const clone = el.cloneNode(true);

	clone.style.backgroundColor = "transparent";

	for(let child of clone.children) {
		child.style.backgroundColor = "transparent";
		child.style.display = "block";
	}

	let artefact = document.getElementById('artefact_title');
	let license = document.getElementById('licenseSpecification');

	var opt = {
	  margin:       12.7,
	  filename:     artefact.innerText.toString() + '_' + license.innerText.toString() + '.pdf',
	  pagebreak: 	'avoid-all', 
	  image:        { type: 'jpeg', quality: 1 },
	  html2canvas:  { scale: 2 },
	  jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
	};

	html2pdf().from(clone).set(opt).toPdf().get('pdf').then(function(pdf) {
	    let totalPages = pdf.internal.getNumberOfPages();
	    for (let i = 1; i <= totalPages; i++) {
	        pdf.setPage(i);
	        pdf.setFontSize(8);
	        pdf.setTextColor(0);
	        pdf.text('Page ' + i + ' of ' + totalPages, (pdf.internal.pageSize.getWidth() / 2.3), (pdf.internal.pageSize.getHeight() - 5));
	    }
	}).save();
}



function downloadTXT() {
  	let el = document.getElementById("preview");
	const clone = el.cloneNode(true);
	let txt = clone.innerText;

	let types = document.getElementsByClassName('license-type');
	let titles = document.getElementsByClassName('title-custom')
	let filename = types[0].innerHTML.toString() + '_' + titles[0].innerHTML.toString();

	let element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}

function downloadPNG() {
    let imageBanner = document.getElementById('banner');

	let types = document.getElementsByClassName('license-type');
	let titles = document.getElementsByClassName('title-custom')
	let filename = 'banner_' + types[0].innerHTML.toString() + '_' + titles[0].innerHTML.toString() + '.png';

	let getCanvas;

    let options = {
    	backgroundColor: null,
    	allowTaint: true,
    	useCORS: true,
    	width: 1200
    }

    html2canvas(imageBanner, options).then(function(canvas){
    		getCanvas = canvas;
    		let imageData = getCanvas.toDataURL("image/png");
    		let a = document.createElement("a");
    		document.body.appendChild(a);
            a.href = imageData;
            a.download = filename;
            a.click();
            document.body.removeChild(a);
    });
}