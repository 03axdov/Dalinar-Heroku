let container = '<div class="container">'

for (let i=0; i < 400; i++) {
    container += '<div class="trigger"></div>'
}

container += '<div class="monitor">'
container += '<div class="camera o-x">'
container += '<div class="camera o-y">'
container += '<div class="camera o-z">'
container += '<div class="vr">'

for (let i=0; i < 20; i++) {
    container += '<div class="vr_layer">'
    container += '<div class="vr_layer_item">'
    container += '</div>'
    container += '</div>'
}

container += "</div>"
container += "</div>"
container += "</div>"
container += "</div>"
container += "</div>"
container += "</div>"

document.getElementById("animation-container").innerHTML = container