const git = require('./git.js')
const getCommits = require('./commits.js')
const getToken = require('./token.js')
const pullRequest = require('./pr.js')

module.exports = async function(context, id, targets) {
    //TODO: Handle errors

    const commits = await getCommits(context)
    const token = await getToken(context.payload.installation.id)
    const pr = await pullRequest.getPR(context, id)
    const reviewers = await pullRequest.getReviewers(context)
    reviewers.push(pr.data.user.login)

    let success = true

    for (const target of targets) {
        let newPrId = -1
        try {
            const branch = await git(context, token, commits, target)
            const newPR = await pullRequest.newReady(context, pr.data.number, pr.data.title, target, branch)
            newPrId = newPR.data.number
            await pullRequest.backportSuccess(context, target, newPrId)
        } catch (e) {
            context.log.debug(e)
            context.log.warn('Backport to ' + target + ' failed')
            success = false
            pullRequest.backportFailed(context, target)
            continue
        }

        await pullRequest.requestReviewers(context, newPrId, reviewers)
    }

    return success
}
