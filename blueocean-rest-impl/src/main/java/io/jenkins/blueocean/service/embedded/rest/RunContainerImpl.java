package io.jenkins.blueocean.service.embedded.rest;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.Item;
import hudson.model.Job;
import hudson.model.Queue;
import hudson.model.Run;
import hudson.model.queue.ScheduleResult;
import hudson.util.RunList;
import io.jenkins.blueocean.commons.ServiceException;
import io.jenkins.blueocean.rest.hal.Link;
import io.jenkins.blueocean.rest.model.BluePipeline;
import io.jenkins.blueocean.rest.model.BlueQueueItem;
import io.jenkins.blueocean.rest.model.BlueRun;
import io.jenkins.blueocean.rest.model.BlueRunContainer;
import jenkins.model.Jenkins;
import jenkins.model.lazy.LazyBuildMixIn;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * @author Vivek Pandey
 */
public class RunContainerImpl extends BlueRunContainer {

    private final Job job;
    private final BluePipeline pipeline;

    public RunContainerImpl(@Nonnull BluePipeline pipeline, @Nonnull Job job) {
        this.job = job;
        this.pipeline = pipeline;
    }

    @Override
    public Link getLink() {
        return pipeline.getLink().rel("runs");
    }

    @Override
    public BlueRun get(String name) {
        RunList<? extends hudson.model.Run> runList = job.getBuilds();

        hudson.model.Run run = null;
        if (name != null) {
            for (hudson.model.Run r : runList) {
                if (r.getId().equals(name)) {
                    run = r;
                    break;
                }
            }
            if (run == null) {
                throw new ServiceException.NotFoundException(
                    String.format("Run %s not found in organization %s and pipeline %s",
                        name, pipeline.getOrganization(), job.getName()));
            }
        } else {
            run = runList.getLastBuild();
        }
        return  AbstractRunImpl.getBlueRun(run, pipeline);
    }

    @Override
    public Iterator<BlueRun> iterator() {
        return RunSearch.findRuns(job, pipeline.getLink()).iterator();
    }

    @Override
    public Iterator<BlueRun> iterator(int start, int limit) {
        if (job instanceof LazyBuildMixIn.LazyLoadingJob) {
            final List<BlueRun> runs = new ArrayList<>();
            final LazyBuildMixIn lazyLoadMixin = ((LazyBuildMixIn.LazyLoadingJob) job).getLazyBuildMixIn();
            final Iterator<Run> runIterator = lazyLoadMixin.getRunMap().iterator();

            int skipCount = start; // Skip up to the start
            while (runIterator.hasNext()) {
                if (skipCount > 0) {
                    skipCount--;
                } else {
                    runs.add(AbstractRunImpl.getBlueRun(runIterator.next(), pipeline));
                }
                if (runs.size() >= limit) {
                    break;
                }
            }

            return runs.iterator();
        } else {
            return super.iterator(start, limit);
        }
    }

    @Override
    public BluePipeline getPipeline(String name) {
        return pipeline;
    }

    /**
     * Schedules a build. If build already exists in the queue and the pipeline does not
     * support running multiple builds at the same time, return a reference to the existing
     * build.
     *
     * @return Queue item.
     */
    @Override
    public BlueQueueItem create() {
        job.checkPermission(Item.BUILD);
        if (job instanceof Queue.Task) {
            ScheduleResult scheduleResult = Jenkins.getInstance()
                .getQueue()
                .schedule2((Queue.Task)job, 0, new CauseAction(new Cause.UserIdCause()));

            if(scheduleResult.isAccepted()) {
                final Queue.Item item = scheduleResult.getItem();

                BlueQueueItem queueItem = QueueContainerImpl.getQueuedItem(item, job);

                if (queueItem == null) {
                    throw new ServiceException.UnexpectedErrorException("The queue item does not exist in the queue");
                } else {
                    return queueItem;
                }
            } else {
                throw new ServiceException.UnexpectedErrorException("Queue item request was not accepted");
            }
        } else {
            throw new ServiceException.NotImplementedException("This pipeline type does not support being queued.");
        }
    }
}
