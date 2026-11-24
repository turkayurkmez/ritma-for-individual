package com.ritma.designsystem

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.unit.Dp

/**
 * Üç boyutlu kalınlık: şeklin [thickness] kadar aşağı kaydırılmış düz renkli kopyası yüzün arkasına çizilir.
 * Gölge ve elevation kullanılmaz. Kapsayıcıya alttan en az [thickness] dolgu ver ki kenar kırpılmasın.
 */
fun Modifier.lip(color: Color, thickness: Dp, shape: Shape): Modifier = drawBehind {
    val outline = shape.createOutline(size, layoutDirection, this)
    translate(top = thickness.toPx()) {
        drawOutline(outline, color)
    }
}
