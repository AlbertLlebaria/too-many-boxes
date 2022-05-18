import readline from 'readline'

/**
 * @enum {Number}
 */
const AXIS = {
    X: 0,
    Y: 1,
    Z: 2,
}
/**
 * @enum {String}
 */
const SORT = {
    ASC: 'asc',
    DESC: 'desc',
}

/**
 * Checks if two cubes intersect between each other
 * between 2 dimensional planes
 * @param {Cube} cube1
 * @param {Cube} cube1
 * @param {AXIS} axis1
 * @param {AXIS} axis2
 * @returns
 */
function lineIntersection(cube1, cube2, axis1, axis2) {
    const intersects =
        cube1.position[axis1] < cube2.position[axis1] + cube2.dim &&
        cube1.position[axis1] + cube1.dim > cube2.position[axis1] &&
        cube1.position[axis2] < cube2.position[axis2] + cube2.dim &&
        cube1.position[axis2] + cube1.dim > cube2.position[axis2]
    return intersects
}

/**
 * 3D point representation
 * @typedef {Object} Position
 * @param {Number} x
 * @param {Number} y
 * @param {Number} z
 * @returns {Position}
 */
class Position {
    constructor(x, y, z) {
        this[AXIS.X] = x
        this[AXIS.Y] = y
        this[AXIS.Z] = z
    }
}

/**
 * Cube
 * @class
 * @param {Number} dim dimension of the cube
 * @returns {Cube}
 */
class Cube {
    constructor(dim) {
        this.dim = dim
        this.volume = Math.pow(dim, 3)
        /**
         * @property {Position} p
         */
        this._p = null
    }

    /**
     * @returns {Position}
     */
    get position() {
        return this._p
    }

    /**
     * @param {Position}
     */
    set position(position) {
        this._p = position
    }

    /**
     *
     * Checks if two cubes intersect between each other in the box
     * @param {Cube} cube
     * @returns {Boolean}
     */
    intersect = (cube) => {
        if (!this.position) {
            return false
        }
        return (
            lineIntersection(this, cube, AXIS.X, AXIS.Y) &&
            lineIntersection(this, cube, AXIS.Y, AXIS.Z) &&
            lineIntersection(this, cube, AXIS.X, AXIS.Z)
        )
    }
}

/**
 * Box
 * @typedef {Object} Box
 * @param {Number} length length dimension (X)
 * @param {Number} width  width dimension (Y)
 * @param {Number} height height dimension (Z)
 */
class Box {
    constructor(length, width, height) {
        this.length = length
        this.width = width
        this.height = height

        this.unFilledVolume = this.length * this.width * this.height
        this.filledVolume = 0
        this.cubes = []
    }

    /**
     * Checks if a cube fits in a given position
     * @param {Cube} cube
     * @param {Position} position
     * @returns
     */
    doesCubeFit = (cube, position) => {
        const lengthFit = this.length >= position[AXIS.X] + cube.dim
        const widthFit = this.width >= position[AXIS.Y] + cube.dim
        const heightFit = this.height >= position[AXIS.Z] + cube.dim
        if (!(lengthFit && heightFit && widthFit)) {
            return false
        }
        cube.position = position
        let fits = true
        for (const cubeInBox of this.cubes) {
            if (cubeInBox.intersect(cube)) {
                fits = false
                break
            }
        }
        return fits
    }

    /**
     * Fits a cube in the box
     * @param {Cube} cube
     */
    fit = function (cube) {
        this.cubes.push(cube)
        this.unFilledVolume -= cube.volume
        this.filledVolume += cube.volume
    }
}

/**
 * Function tries to set a set of cubes into a box.
 * Function decides which cube should be fit by using a
 * "first fit first in" approach.
 * Already checked cubes are not fit inside again anymore.
 *
 * @recursive
 * @param {Box} box
 * @param {Cube[]} cubes
 */
function firstFit(box, cubes, skip = true) {
    const nonUsedCubes = []
    let position = new Position(0, 0, 0)
    for (const cube of cubes) {
        let fits = false
        // Check if there is still space to fill
        if (box.unFilledVolume === 0) {
            break
        }
        // If box is empty
        if (box.cubes.length === 0) {
            position = new Position(0, 0, 0)
            if (box.doesCubeFit(cube, position)) {
                box.fit(cube)
                fits = true
                continue
            }
        } else {
            // If box is not empty try to find a free spot in the box
            find: for (let axis = 0; axis < 3; axis++) {
                for (const usedCube of box.cubes) {
                    switch (axis) {
                        case AXIS.X:
                            position = new Position(
                                usedCube.position[AXIS.X] + usedCube.dim,
                                usedCube.position[AXIS.Y],
                                usedCube.position[AXIS.Z]
                            )
                            break
                        case AXIS.Y:
                            position = new Position(
                                usedCube.position[AXIS.X],
                                usedCube.position[AXIS.Y] + usedCube.dim,
                                usedCube.position[AXIS.Z]
                            )
                            break
                        case AXIS.Z:
                            position = new Position(
                                usedCube.position[AXIS.X],
                                usedCube.position[AXIS.Y],
                                usedCube.position[AXIS.Z] + usedCube.dim
                            )
                            break
                    }
                    if (box.doesCubeFit(cube, position)) {
                        box.fit(cube)
                        fits = true
                        break find
                    }
                }
            }
        }

        if (!fits) {
            nonUsedCubes.push(cube)
        }
    }
    // console.log(`nonUsedCubes ${nonUsedCubes.length}`);
    if (nonUsedCubes.length > 0 && nonUsedCubes.length < cubes.length) {
        return firstFit(box, nonUsedCubes)
    }
}

/**
 * Function creates a set of cubes from an array descriptor.
 * Array descriptor contains the number of cubes of each dimension and the different dimensions.
 * For an array descriptor [100,10,1] function returns 100 cubes of 1x1x1 and 10 cubes of 2x2x2 and 1 cube of 4x4x4.
 *
 * @param {Number[]} cubeDetails List of cubes to create, where first elem consist of a 1x1 cube and last one NxN cube.
 * @param {SORT} sort Sorting order (by size) of cube result array
 * @returns
 */
const createCubes = (cubeDetails, sort = SORT.ASC) => {
    let cubes = []
    let dimension = 1

    if (sort === SORT.DESC) {
        cubeDetails.reverse()
        dimension = cubeDetails.length
    }
    for (const numberOfCubes of cubeDetails) {
        const dimCubes = Array(numberOfCubes)
            .fill(null)
            .map(() => new Cube(dimension))
        cubes = [...cubes, ...dimCubes]
        if (sort === SORT.DESC) {
            dimension -= 1
        } else {
            dimension += 1
        }
    }
    return cubes
}

// MAIN
(async () => {
    var rl = readline.createInterface(process.stdin, process.stdout)
    rl.setPrompt(`Give me a box challenge \n`)
    rl.prompt()
    rl.on('line', (line) => {
        const args = line
            .trim()
            .split(' ')
            .map((dimension) => parseInt(dimension, 10))
        const boxDimensions = args.splice(0, 3)
        const cubeDetails = args
        if (!(boxDimensions.length === 3)) {
            console.log(
                `Missing arguments. Box size ${boxDimensions.length} is invalid. Box must have [length, width, height]`
            )
            return
        }
        if (!(cubeDetails.length > 0)) {
            console.log(
                `Unsolvable problem due: missing arguments, cubes were not provided`
            )
            return
        }
        // Create cubes
        const cubes = createCubes(cubeDetails, SORT.DESC)
        const [length, width, height] = boxDimensions
        const bestFittingBox = new Box(length, width, height)
        firstFit(bestFittingBox, cubes, [0, 0, 0])
        let box = bestFittingBox

        if (box.unFilledVolume > 0) {
            console.log(-1)
            // console.log(
            //     `Unfilled volume ${box.filledVolume}/${box.unFilledVolume}. Used boxes ${box.length}`
            // )
        } else {
            console.log(bestFittingBox.cubes.length)
        }
    })
})()
